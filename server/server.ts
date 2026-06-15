import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs/promises';
import OpenAI from 'openai';
import z from 'zod';

import { sessionEventTypes, type Message, type ServerSentSessionEvent, type Session as SharedSession } from '../shared';
import { Assistant } from './assistant';
import { Session } from './session';
import { createId } from './utils';

const sessionFile = process.env.SESSION_FILE as string;

async function loadSession() {
  return fs
    .readFile(sessionFile)
    .then(String)
    .then(JSON.parse)
    .then((session) => Session.from(session));
}

async function saveSession(session: Session) {
  await fs.writeFile(sessionFile, JSON.stringify(serializeSession(session), null, 2));
}

function serializeSession(session: Session): SharedSession {
  return {
    subject: session.subject,
    topics: session.topics,
    notes: session.notes,
    messages: session.messages,
    timerStartDate: session.timerStartDate?.toISOString(),
    events: session.events,
  };
}

const client = new OpenAI({
  baseURL: 'https://api.mammouth.ai/v1',
  apiKey: process.env.MAMMOUTH_API_KEY,
});

const instructions = await fs.readFile('instructions.md').then(String);
let session = await loadSession();

export const app = express();

app.use(express.json());

app.get('/session', async (req, res) => {
  res.json(serializeSession(session));
});

app.delete('/session', async (_req, res) => {
  session = new Session();

  session.addMessage({
    id: createId(),
    role: 'system',
    content: instructions,
  });

  await saveSession(session);
  res.status(204).end();
});

app.get('/chat', async (req, res) => {
  const { message } = z.object({ message: z.string().min(1) }).parse(req.query);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = ({ type, ...event }: ServerSentSessionEvent) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(event)}\n\n`);
  };

  const subjectChanged = () => sendEvent({ type: 'subjectChanged', subject: session.subject });
  const topicsChanged = () => sendEvent({ type: 'topicsChanged', topics: session.topics });
  const notesChanged = () => sendEvent({ type: 'notesChanged', notes: session.notes });
  const timerStarted = ({ date }: { date: string }) => sendEvent({ type: 'timerStarted', date });
  const messageAdded = ({ message }: { message: Message }) => sendEvent({ type: 'messageAdded', message });

  const listeners = new Set<() => void>([
    session.addListener('planInitialized', () => {
      subjectChanged();
      topicsChanged();
    }),
    session.addListener('subjectChanged', subjectChanged),
    session.addListener('topicAdded', topicsChanged),
    session.addListener('topicRemoved', topicsChanged),
    session.addListener('topicLabelChanged', topicsChanged),
    session.addListener('topicStatusChanged', topicsChanged),
    session.addListener('noteAdded', notesChanged),
    session.addListener('noteRemoved', notesChanged),
    session.addListener('noteContentChanged', notesChanged),
    session.addListener('timerStarted', timerStarted),
    session.addListener('messageAdded', messageAdded),
    ...sessionEventTypes.map((type) =>
      session.addListener(type, (event) => sendEvent({ type: 'sessionEventEmitted', event })),
    ),
  ]);

  try {
    const assistant = new Assistant(client, 'gpt-4.1-mini');

    assistant.addListener('chunk', (text) => {
      sendEvent({ type: 'chunk', text });
    });

    session.addMessage({
      id: createId(),
      role: 'user',
      content: message,
    });

    await assistant.run(session);

    sendEvent({ type: 'done' });
    await saveSession(session);
  } catch (error) {
    console.error(error);

    sendEvent({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    listeners.forEach((remove) => remove());
    res.end();
  }
});

app.use((req, res) => {
  res.status(404).end();
});

app.use(((err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json(z.formatError(err));
  }

  console.error(err);
  res.status(500);

  if (err instanceof Error) {
    res.send(err.message);
  } else {
    res.end();
  }
}) satisfies ErrorRequestHandler);

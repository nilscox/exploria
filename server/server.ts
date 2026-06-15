import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs/promises';
import OpenAI from 'openai';
import z from 'zod';

import { sessionEventTypes, type Message, type ServerSentSessionEvent, type Session as SharedSession } from '../shared';
import { Assistant } from './assistant';
import { Session } from './session';
import { TestAssistant } from './test-assistant';
import { createId } from './utils';

import type { ServerSentMessageEvent } from '../shared';

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
    timer: session.timer ?? undefined,
    events: session.events,
  };
}

class ServerSentEvent<Event extends { type: string }> {
  private res: express.Response;

  constructor(res: express.Response) {
    this.res = res;

    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
  }

  send({ type, ...event }: Event) {
    this.res.write(`event: ${type}\n`);
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
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

app.get('/session/message', async (req, res) => {
  const { message } = z.object({ message: z.string().min(1) }).parse(req.query);
  const stream = new ServerSentEvent<ServerSentMessageEvent>(res);

  try {
    const assistant = process.env.TEST === 'true' ? new TestAssistant() : new Assistant(client, 'gpt-4.1-mini');

    assistant.addListener('chunk', (text) => {
      stream.send({ type: 'message:chunk', text });
    });

    session.addMessage({
      id: createId(),
      role: 'user',
      content: message,
    });

    await assistant.run(session);

    stream.send({ type: 'message:done' });
    await saveSession(session);
  } catch (error) {
    console.error(error);

    stream.send({
      type: 'message:error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    res.end();
  }
});

app.get('/session/stream', async (req, res) => {
  const stream = new ServerSentEvent<ServerSentSessionEvent>(res);

  const subjectChanged = () => stream.send({ type: 'session:subjectChanged', subject: session.subject });
  const topicsChanged = () => stream.send({ type: 'session:topicsChanged', topics: session.topics });
  const notesChanged = () => stream.send({ type: 'session:notesChanged', notes: session.notes });
  const timerChanged = () => stream.send({ type: 'session:timerChanged', timer: session.timer ?? undefined });
  const messageAdded = ({ message }: { message: Message }) => stream.send({ type: 'session:messageAdded', message });

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
    session.addListener('timerStarted', timerChanged),
    session.addListener('timerPaused', timerChanged),
    session.addListener('timerResumed', timerChanged),
    session.addListener('messageAdded', messageAdded),
    ...sessionEventTypes.map((type) =>
      session.addListener(type, (event) => stream.send({ type: 'session:eventEmitted', event })),
    ),
  ]);

  res.on('close', () => {
    listeners.forEach((remove) => remove());
    res.end();
  });
});

app.use('/timer/pause', (req, res) => {
  session.pauseTimer();
  res.status(204).end();
});

app.use('/timer/resume', (req, res) => {
  session.resumeTimer();
  res.status(204).end();
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

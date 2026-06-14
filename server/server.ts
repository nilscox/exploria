import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs/promises';
import OpenAI from 'openai';
import z from 'zod';

import { Assistant } from './assistant';
import { Session } from './session';
import { sessionEventTypes, type SessionEventType } from './types';

import type { AnyFunction } from './utils';

const sessionFile = process.env.SESSION_FILE as string;

async function loadSession() {
  return fs
    .readFile(sessionFile)
    .then(String)
    .then(JSON.parse)
    .then((session) => Session.from(session));
}

async function saveSession(session: Session) {
  await fs.writeFile(sessionFile, JSON.stringify(session.serialize(), null, 2));
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
  res.json(session.serialize());
});

app.delete('/session', async (_req, res) => {
  session = new Session(instructions);

  await saveSession(session);
  res.status(204).end();
});

app.get('/chat', async (req, res) => {
  const { message } = z.object({ message: z.string().min(1) }).parse(req.query);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const listeners = new Map<SessionEventType, AnyFunction>();

  sessionEventTypes.map((type) => {
    const listener = (payload: unknown) => {
      sendEvent(type, payload);
    };

    listeners.set(type, listener);
    session.addListener(type, listener);
  });

  try {
    const assistant = new Assistant(client, 'gpt-4.1-mini');

    assistant.addListener('chunk', (text) => {
      sendEvent('chunk', text);
    });

    session.addMessage({
      role: 'user',
      content: message,
    });

    await assistant.run(session);

    sendEvent('done', {});
    await saveSession(session);
  } catch (error) {
    console.error(error);

    sendEvent('error', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    listeners.forEach((listener, type) => {
      session.removeListener(type, listener);
    });

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

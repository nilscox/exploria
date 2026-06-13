import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs/promises';
import OpenAI from 'openai';
import z from 'zod';

import { Assistant } from './assistant';
import { Session } from './session';

import type { SessionEvent } from './types';

const client = new OpenAI({
  baseURL: 'https://api.mammouth.ai/v1',
  apiKey: process.env.MAMMOUTH_API_KEY,
});

const instructions = await fs.readFile('instructions.md').then(String);
let session = new Session(instructions);

export const app = express();

app.use(express.json());

app.get('/session', async (req, res) => {
  res.json(session.serialize());
});

app.delete('/session', (_req, res) => {
  session = new Session(instructions);

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

  for (const type of ['plan_updated', 'topic_updated', 'message_added'] satisfies Array<SessionEvent['type']>) {
    session.addListener(type, (payload) => sendEvent(type, payload));
  }

  session.addMessage({
    role: 'user',
    content: message,
  });

  const assistant = new Assistant(client, 'gpt-4.1-mini');

  assistant.addListener('chunk', (text) => sendEvent('chunk', text));

  await assistant.run(session);

  session.removeAllListeners();

  sendEvent('done', {});
  res.end();
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

import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import fs from 'node:fs/promises';
import z from 'zod';

import { runTurn } from './conversation-loop';
import { Session } from './types';

const instructions = await fs.readFile('instructions.md').then(String);
const app = express();

app.use(express.json());

let session: Session = {
  messages: [{ role: 'system', content: instructions }],
  plan: { topics: [] },
};

app.post('/chat', async (req, res) => {
  const { message } = z.object({ message: z.string().min(1) }).parse(req.body);

  if (!message) {
    res.status(400).json({ error: 'message requis' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  session.messages.push({ role: 'user', content: message });

  session = await runTurn(
    session,
    (chunk) => sendEvent('chunk', { text: chunk }),
    (plan) => sendEvent('plan', plan),
  );

  sendEvent('done', {});
  res.end();
});

app.delete('/session', (_req, res) => {
  session = {
    messages: [{ role: 'system', content: instructions }],
    plan: { topics: [] },
  };

  res.status(204).end();
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

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

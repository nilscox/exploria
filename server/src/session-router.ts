import type {
  ServerSentMessageEvent,
  ServerSentSessionEvent,
  SessionEvent,
  Session as SharedSession,
} from '@exploria/shared';
import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs/promises';
import OpenAI from 'openai';
import z from 'zod';

import { Assistant } from './assistant';
import { di } from './di';
import { Session } from './session';
import { ServerSentEvent } from './sse';
import { TestAssistant } from './test-assistant';
import { defined } from './utils';

export const router = express.Router();

const client = new OpenAI({
  baseURL: process.env.OPEN_AI_BASE_URL,
  apiKey: process.env.OPEN_AI_API_KEY,
});

const sessionContext = new AsyncLocalStorage<Session>();
const getSession = () => defined(sessionContext.getStore());

router.get('/', async (req, res) => {
  const sessionRepository = di.resolve('sessionRepository');

  const sessions = await sessionRepository.findMany();

  res.send(
    sessions.map(({ id, subject, createdAt }) => ({
      id,
      subject,
      date: createdAt.toISOString(),
    })),
  );
});

router.post('/', async (req, res) => {
  const sessionRepository = di.resolve('sessionRepository');
  const session = new Session();

  const instructions = await fs.readFile('instructions.md').then(String);

  session.addMessage('system', instructions);

  await sessionRepository.insert(session);
  await sessionRepository.save(session);

  res.status(201).send(session.id);
});

router.param('id', async (req, res, next, id: string) => {
  const sessionRepository = di.resolve('sessionRepository');
  const session = await sessionRepository.find(id);

  if (!session) {
    return res.status(404).end();
  }

  sessionContext.run(session, next);
});

router.get('/:id', async (req, res) => {
  const db = di.resolve('database');

  const events = await db.query.sessionEvents.findMany({
    where: { sessionId: req.params.id },
    orderBy: { date: 'asc' },
  });

  res.json(
    serializeSession(
      getSession(),
      events.map(
        (event): SessionEvent =>
          ({
            id: event.id,
            type: event.type,
            date: event.date.toISOString(),
            ...event.payload,
          }) as SessionEvent,
      ),
    ),
  );
});

router.delete('/:id', async (req, res) => {
  const sessionRepository = di.resolve('sessionRepository');

  await sessionRepository.delete(req.params.id);

  res.status(204).end();
});

router.get('/:id/message', async (req, res) => {
  const session = getSession();
  const { message } = z.object({ message: z.string().min(1) }).parse(req.query);
  const sse = new ServerSentEvent<ServerSentMessageEvent>(res);
  const events = di.resolve('events');
  const sessionRepository = di.resolve('sessionRepository');

  try {
    const assistant = process.env.TEST === 'true' ? new TestAssistant() : new Assistant(client, 'gpt-4.1-mini');

    await assistant.run(session, {
      message,
      onChunk: (text) => sse.send({ type: 'message:chunk', text }),
    });

    await sessionRepository.save(session);

    events.emit(...session.pullDomainEvents());

    sse.send({ type: 'message:done' });
  } catch (error) {
    console.error(error);

    sse.send({
      type: 'message:error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    res.end();
  }
});

router.get('/:id/stream', async (req, res) => {
  const streams = di.resolve('sessionStreams');
  const session = getSession();
  const sse = new ServerSentEvent<ServerSentSessionEvent>(res);

  streams.add(session.id, sse);

  res.on('close', () => {
    res.end();
  });
});

router.put('/:id/timer/pause', async (req, res) => {
  const session = getSession();
  const sessionRepository = di.get('sessionRepository');
  const events = di.get('events');

  session.pauseTimer();

  await sessionRepository?.save(session);
  events?.emit(...session.pullDomainEvents());

  res.status(204).end();
});

router.put('/:id/timer/resume', async (req, res) => {
  const session = getSession();
  const sessionRepository = di.get('sessionRepository');
  const events = di.get('events');

  session.resumeTimer();

  await sessionRepository?.save(session);
  events?.emit(...session.pullDomainEvents());

  res.status(204).end();
});

function serializeSession(session: Session, events: SessionEvent[]): SharedSession {
  return {
    id: session.id,
    subject: session.subject,
    topics: session.topics,
    notes: session.notes,
    messages: session.messages,
    timer: session.timer ?? undefined,
    events,
  };
}

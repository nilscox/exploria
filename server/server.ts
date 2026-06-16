import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs/promises';
import OpenAI from 'openai';
import z from 'zod';

import { sessionEventTypes, type ServerSentSessionEvent, type Session as SharedSession } from '../shared';
import { Assistant } from './assistant';
import { drizzleDatabase } from './database';
import { SessionRepository } from './database/session-repository';
import { di, NativeDateAdapter } from './di';
import { Events } from './events';
import { Session } from './session';
import { TestAssistant } from './test-assistant';
import { createId, defined, MapSet } from './utils';

import type { GetSessionEvent, ServerSentMessageEvent, SessionEvent } from '../shared';

di.bind('date', new NativeDateAdapter());
di.bind('events', new Events());
di.bind('database', drizzleDatabase);
di.bind('sessionRepository', new SessionRepository());

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

class ServerSentEvent<Event extends { type: string }> {
  private res: express.Response;

  constructor(res: express.Response) {
    this.res = res;

    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.flushHeaders();
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

export const app = express();
const session = express.Router();

app.use(express.json());

app.use('/session', session);

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

const sessionContext = new AsyncLocalStorage<Session>();
const getSession = () => defined(sessionContext.getStore());

session.get('/', async (req, res) => {
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

session.post('/', async (req, res) => {
  const dateAdapter = di.resolve('date');
  const sessionRepository = di.resolve('sessionRepository');
  const session = new Session(createId());

  await sessionRepository.insert(session);

  session.addMessage({
    id: createId(),
    date: dateAdapter.now().toISOString(),
    role: 'system',
    content: instructions,
  });

  await sessionRepository.save(session);

  res.status(201).send(session.id);
});

session.param('id', async (req, res, next, id: string) => {
  const sessionRepository = di.resolve('sessionRepository');
  const session = await sessionRepository.find(id);

  if (!session) {
    return res.status(404).end();
  }

  sessionContext.run(session, next);
});

session.get('/:id', async (req, res) => {
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

session.delete('/:id', async (req, res) => {
  const sessionRepository = di.resolve('sessionRepository');

  await sessionRepository.delete(req.params.id);

  res.status(204).end();
});

session.get('/:id/message', async (req, res) => {
  const session = getSession();
  const { message } = z.object({ message: z.string().min(1) }).parse(req.query);
  const stream = new ServerSentEvent<ServerSentMessageEvent>(res);
  const dateAdapter = di.resolve('date');
  const events = di.resolve('events');
  const sessionRepository = di.resolve('sessionRepository');

  try {
    const assistant = process.env.TEST === 'true' ? new TestAssistant() : new Assistant(client, 'gpt-4.1-mini');

    assistant.addListener('chunk', (text) => {
      stream.send({ type: 'message:chunk', text });
    });

    session.addMessage({
      id: createId(),
      date: dateAdapter.now().toISOString(),
      role: 'user',
      content: message,
    });

    await assistant.run(session);

    await sessionRepository.save(session);
    events.emit(...session.pullDomainEvents());

    stream.send({ type: 'message:done' });
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

class SessionStream {
  private streams = new MapSet<string, ServerSentEvent<ServerSentSessionEvent>>();

  constructor() {
    this.bindEvents();
  }

  add(sessionId: string, stream: ServerSentEvent<ServerSentSessionEvent>) {
    this.streams.add(sessionId, stream);
  }

  remove(sessionId: string, stream: ServerSentEvent<ServerSentSessionEvent>) {
    this.streams.remove(sessionId, stream);
  }

  private bindEvents() {
    const events = di.resolve('events');
    const repository = di.resolve('sessionRepository');

    const handle = <E extends SessionEvent>(handler: (session: Session, event: E) => void) => {
      return async (event: E) => {
        handler(defined(await repository.find(event.entityId)), event);
      };
    };

    const planInitialized = (session: Session) => {
      this.send(session.id, { type: 'session:subjectChanged', subject: session.subject });
      this.send(session.id, { type: 'session:topicsChanged', topics: session.topics });
    };

    const subjectChanged = (session: Session) => {
      this.send(session.id, { type: 'session:subjectChanged', subject: session.subject });
    };

    const topicsChanged = (session: Session) => {
      this.send(session.id, { type: 'session:topicsChanged', topics: session.topics });
    };

    const notesChanged = (session: Session) => {
      this.send(session.id, { type: 'session:notesChanged', notes: session.notes });
    };

    const timerChanged = (session: Session) => {
      this.send(session.id, { type: 'session:timerChanged', timer: session.timer ?? undefined });
    };

    const messageAdded = (session: Session, { message }: GetSessionEvent<'messageAdded'>) => {
      this.send(session.id, { type: 'session:messageAdded', message });
    };

    events.addListener('planInitialized', handle(planInitialized));
    events.addListener('subjectChanged', handle(subjectChanged));
    events.addListener('topicAdded', handle(topicsChanged));
    events.addListener('topicRemoved', handle(topicsChanged));
    events.addListener('topicLabelChanged', handle(topicsChanged));
    events.addListener('topicStatusChanged', handle(topicsChanged));
    events.addListener('noteAdded', handle(notesChanged));
    events.addListener('noteRemoved', handle(notesChanged));
    events.addListener('noteContentChanged', handle(notesChanged));
    events.addListener('timerStarted', handle(timerChanged));
    events.addListener('timerCleared', handle(timerChanged));
    events.addListener('timerPaused', handle(timerChanged));
    events.addListener('timerResumed', handle(timerChanged));
    events.addListener<GetSessionEvent<'messageAdded'>>('messageAdded', handle(messageAdded));

    for (const type of sessionEventTypes) {
      events.addListener<SessionEvent>(type, (event) =>
        this.send(event.entityId, { type: 'session:eventEmitted', event }),
      );
    }
  }

  private send(sessionId: string, event: ServerSentSessionEvent) {
    this.streams.get(sessionId)?.forEach((stream) => stream.send(event));
  }
}

const streams = new SessionStream();

session.get('/:id/stream', async (req, res) => {
  const session = getSession();
  const stream = new ServerSentEvent<ServerSentSessionEvent>(res);

  streams.add(session.id, stream);

  res.on('close', () => {
    res.end();
  });
});

session.put('/:id/timer/pause', async (req, res) => {
  const session = getSession();
  const sessionRepository = di.get('sessionRepository');
  const events = di.get('events');

  session.pauseTimer();

  await sessionRepository?.save(session);
  events?.emit(...session.pullDomainEvents());

  res.status(204).end();
});

session.put('/:id/timer/resume', async (req, res) => {
  const session = getSession();
  const sessionRepository = di.get('sessionRepository');
  const events = di.get('events');

  session.resumeTimer();

  await sessionRepository?.save(session);
  events?.emit(...session.pullDomainEvents());

  res.status(204).end();
});

import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs/promises';
import type { OutgoingMessage } from 'node:http';
import z from 'zod';

import { type Clock, type Generator } from '../di';
import { Session } from '../domain/session';
import { defined } from '../utils';
import { ServerSentEvent, type SseUiNotifier } from './sse';

import type { Assistant } from '../assistant';
import type { DomainEventSelect } from '../database/model';
import type { SessionRepository } from '../database/session-repository';
import type { EventBus } from '../event-bus';
import type { Shared } from '../shared';

export class SessionController {
  private readonly generator: Generator;
  private readonly clock: Clock;
  private readonly events: EventBus;
  private readonly uiNotifier: SseUiNotifier;
  private readonly sessionRepository: SessionRepository;
  private readonly assistant: Assistant;

  public router = express.Router();

  private sessionContext = new AsyncLocalStorage<Session>();

  private getSessionInstance() {
    return defined(this.sessionContext.getStore());
  }

  constructor(
    generator: Generator,
    clock: Clock,
    events: EventBus,
    uiNotifier: SseUiNotifier,
    assistant: Assistant,
    sessionRepository: SessionRepository,
  ) {
    this.generator = generator;
    this.clock = clock;
    this.events = events;
    this.uiNotifier = uiNotifier;
    this.sessionRepository = sessionRepository;
    this.assistant = assistant;

    this.router.param('id', async (req, res, next, id: string) => {
      const session = await this.sessionRepository.find(id);

      if (!session) {
        res.status(404).end();
      } else {
        this.sessionContext.run(session, next);
      }
    });

    this.router.get('/', async (req, res) => {
      res.json(await this.listSessions());
    });

    this.router.post('/', async (req, res) => {
      res.status(201).send(await this.createSession());
    });

    this.router.get('/:id', async (req, res) => {
      res.send(await this.getSession(req.params.id));
    });

    this.router.delete('/:id', async (req, res) => {
      await this.deleteSession(req.params.id);
      res.status(204).end();
    });

    this.router.post('/:id/message', async (req, res) => {
      const { message } = z.object({ message: z.string().min(1) }).parse(req.body);
      await this.postMessage(message);
      res.status(204).end();
    });

    this.router.get('/:id/stream', (req, res) => {
      this.stream(res);
    });

    this.router.put('/:id/timer/pause', async (req, res) => {
      await this.pauseTimer();
      res.status(204).end();
    });

    this.router.put('/:id/timer/resume', async (req, res) => {
      await this.resumeTimer();
      res.status(204).end();
    });
  }

  private async listSessions() {
    const sessions = await this.sessionRepository.findMany();

    return sessions.map(({ id, subject, createdAt }) => ({
      id,
      subject,
      date: createdAt.toISOString(),
    }));
  }

  private async createSession() {
    const session = new Session(this.generator, this.clock, this.uiNotifier);

    const instructions = await fs.readFile('instructions.md').then(String);

    session.addMessage('system', instructions);

    await this.sessionRepository.insert(session);
    await this.sessionRepository.save(session);

    return session.id;
  }

  private async getSession(sessionId: string) {
    const events = await this.sessionRepository.findEvents(sessionId);

    return this.serializeSession(this.getSessionInstance(), events);
  }

  private serializeSession(session: Session, events: DomainEventSelect[]): Shared.Session {
    const serializeSessionEvent = ({ id, type, occurredAt, payload }: DomainEventSelect) => {
      return {
        id,
        type,
        date: occurredAt.toISOString(),
        ...payload,
      } as Shared.SessionEvent;
    };

    return {
      id: session.id,
      subject: session.subject,
      topics: session.topics,
      notes: session.notes,
      timer: session.timer,
      events: events.map(serializeSessionEvent),
    };
  }

  private async deleteSession(sessionId: string) {
    await this.sessionRepository.delete(sessionId);
  }

  private async postMessage(message: string) {
    const session = this.getSessionInstance();

    await this.assistant.run(session, message);
    await this.sessionRepository.save(session);

    this.events.emit(...session.pullDomainEvents());
  }

  private stream(res: OutgoingMessage) {
    const session = this.getSessionInstance();
    const sse = new ServerSentEvent(res);

    this.uiNotifier.add(session.id, sse);

    res.on('close', () => {
      this.uiNotifier.remove(session.id, sse);
      res.end();
    });
  }

  private async pauseTimer() {
    const session = this.getSessionInstance();

    session.pauseTimer();

    await this.sessionRepository.save(session);
    this.events.emit(...session.pullDomainEvents());
  }

  private async resumeTimer() {
    const session = this.getSessionInstance();

    session.resumeTimer();

    await this.sessionRepository.save(session);
    this.events.emit(...session.pullDomainEvents());
  }
}

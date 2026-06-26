import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { OutgoingMessage } from 'node:http';
import z from 'zod';

import { languages } from '../domain/i18n';
import { toSessionView } from '../domain/projections/session-view';
import { Session, postures } from '../domain/session';
import { defined } from '../utils';
import { parsePagination } from './pagination';
import { ServerSentEvent, type SseUiNotifier } from './sse';

import type { Clock } from '../adapters/clock';
import type { Generator } from '../adapters/generator';
import type { SessionRepository } from '../database/session-repository';
import type { Assistant } from '../domain/assistant';
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
    this.assistant = assistant;
    this.sessionRepository = sessionRepository;

    this.router.param('id', async (req, res, next, id: string) => {
      const session = await this.sessionRepository.find(id);

      if (!session) {
        res.status(404).end();
      } else {
        this.sessionContext.run(session, next);
      }
    });

    this.router.get('/', async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const [total, sessions] = await this.listSessions({ offset, limit });

      res.setHeader('X-Page', page);
      res.setHeader('X-Total-Pages', Math.ceil(total / limit));
      res.json(sessions);
    });

    this.router.post('/', async (req, res) => {
      const { model, language, demo } = z
        .object({
          model: z.string().min(1),
          language: z.enum(languages).default('en'),
          demo: z.boolean().optional(),
        })
        .parse(req.body);

      res.status(201).send(await this.createSession({ model, language, demo }));
    });

    this.router.get('/:id', async (req, res) => {
      res.send(await this.getSession(req.params.id));
    });

    this.router.delete('/:id', async (req, res) => {
      await this.deleteSession(req.params.id);
      res.status(204).end();
    });

    this.router.get('/:id/events', async (req, res) => {
      res.json(await this.listEvents(req.params.id));
    });

    this.router.put('/:id/model', async (req, res) => {
      const { model } = z.object({ model: z.string().min(1) }).parse(req.body);

      await this.setModel(model);

      res.status(204).end();
    });

    this.router.put('/:id/posture', async (req, res) => {
      const { posture } = z.object({ posture: z.enum([...postures, 'auto']) }).parse(req.body);

      await this.setPosture(posture);

      res.status(204).end();
    });

    this.router.post('/:id/topic', async (req, res) => {
      const { topic } = z.object({ topic: z.string().min(1).max(64) }).parse(req.body);

      await this.addTopic(topic);

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

    this.router.post('/:id/discussion-path/:pathId', async (req, res) => {
      await this.selectDiscussionPath(req.params.pathId);
      res.status(204).end();
    });

    this.router.post('/:id/timer', async (req, res) => {
      const { duration } = z
        .object({
          duration: z
            .number()
            .min(5)
            .max(4 * 60),
        })
        .parse(req.body);

      await this.startTimer(duration);

      res.status(204).end();
    });

    this.router.delete('/:id/timer', async (req, res) => {
      await this.clearTimer();
      res.status(204).end();
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

  private async listSessions({ offset, limit }: { offset: number; limit: number }) {
    const total = await this.sessionRepository.count();
    const sessions = await this.sessionRepository.findMany({ offset, limit });

    return [
      total,
      sessions.map(({ id, subject, createdAt }) => ({
        id,
        subject,
        date: createdAt.toISOString(),
      })),
    ] as const;
  }

  private async createSession({ model, language, demo }: { model: string; language: Shared.Language; demo?: boolean }) {
    const session = Session.create(this.generator, this.clock, { model, language });

    await this.sessionRepository.insert(session);
    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);

    if (demo) {
      void this.generateDemo(session);
    }

    return session.id;
  }

  private makeCommit(session: Session) {
    return async () => {
      const committed = await this.sessionRepository.save(session);

      this.events.emit(...committed);
    };
  }

  private async generateDemo(session: Session) {
    try {
      await this.assistant.generateDemo(session, this.makeCommit(session));
    } catch (error) {
      console.error(error);
    }
  }

  private async getSession(sessionId: string) {
    const events = await this.sessionRepository.findEvents(sessionId);

    return toSessionView(sessionId, events);
  }

  private async deleteSession(sessionId: string) {
    await this.sessionRepository.delete(sessionId);
  }

  private async listEvents(sessionId: string) {
    return this.sessionRepository.findEvents(sessionId);
  }

  private async setModel(model: string) {
    const session = this.getSessionInstance();

    session.setModel(model);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async setPosture(posture: (typeof postures)[number] | 'auto') {
    const session = this.getSessionInstance();

    session.setPosture(posture, '', true);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async addTopic(label: string) {
    const session = this.getSessionInstance();

    session.addTopic({ label });

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async postMessage(message: string) {
    const session = this.getSessionInstance();

    await this.assistant.run(session, message, this.makeCommit(session));
  }

  private async selectDiscussionPath(pathId: string) {
    const session = this.getSessionInstance();
    const commit = this.makeCommit(session);

    session.selectDiscussionPath(pathId);
    await commit();

    await this.assistant.run(session, undefined, commit);
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

  private async startTimer(duration: number) {
    const session = this.getSessionInstance();

    session.startTimer(duration);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async clearTimer() {
    const session = this.getSessionInstance();

    session.clearTimer();

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async pauseTimer() {
    const session = this.getSessionInstance();

    session.pauseTimer();

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async resumeTimer() {
    const session = this.getSessionInstance();

    session.resumeTimer();

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }
}

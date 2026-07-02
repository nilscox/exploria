import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { OutgoingMessage } from 'node:http';
import z from 'zod';

import { languages } from '../domain/i18n/index.ts';
import { toSessionView } from '../domain/projections/session-view.ts';
import { Session, postures, type TopicStatus } from '../domain/session.ts';
import { defined } from '../utils.ts';
import { parsePagination } from './pagination.ts';
import { ServerSentEvent, type SseUiNotifier } from './sse.ts';

import type { Clock } from '../adapters/clock.ts';
import type { Generator } from '../adapters/generator.ts';
import type { SessionRepository } from '../database/session-repository.ts';
import type { IAssistant } from '../domain/assistant.ts';
import type { EventBus } from '../event-bus.ts';
import type { Shared } from '../shared.ts';

export class SessionController {
  private readonly generator: Generator;
  private readonly clock: Clock;
  private readonly events: EventBus;
  private readonly uiNotifier: SseUiNotifier;
  private readonly sessionRepository: SessionRepository;
  private readonly assistant: IAssistant;

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
    assistant: IAssistant,
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
        return;
      }

      const isPublic = session.ownerId === null;
      const isOwner = session.ownerId === req.user?.id;

      if (!isPublic && !isOwner) {
        res.status(404).end();
        return;
      }

      this.sessionContext.run(session, next);
    });

    this.router.get('/', async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const ownerId = req.user?.id ?? null;
      const [total, sessions] = await this.listSessions({ offset, limit, ownerId });

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

      const ownerId = req.user?.id ?? null;

      res.status(201).send(await this.createSession({ model, language, demo, ownerId }));
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

    this.router.post('/:id/node', async (req, res) => {
      const { label, parentId } = z
        .object({ label: z.string().min(1).max(64), parentId: z.string().nullish() })
        .parse(req.body);

      await this.addNode(label, parentId ?? null);

      res.status(204).end();
    });

    this.router.put('/:id/node/:nodeId', async (req, res) => {
      const { label, status } = z
        .object({
          label: z.string().min(1).max(64).optional(),
          status: z.enum(['pending', 'in_progress', 'done']).optional(),
        })
        .parse(req.body);

      await this.updateNode(req.params.nodeId, { label, status });
      res.status(204).end();
    });

    this.router.delete('/:id/node/:nodeId', async (req, res) => {
      await this.removeNode(req.params.nodeId);
      res.status(204).end();
    });

    this.router.put('/:id/node/:nodeId/move', async (req, res) => {
      const { parentId } = z.object({ parentId: z.string().nullable() }).parse(req.body);

      await this.moveNode(req.params.nodeId, parentId);
      res.status(204).end();
    });

    this.router.post('/:id/note', async (req, res) => {
      const { content, nodeId } = z
        .object({ content: z.string().min(1), nodeId: z.string().nullish() })
        .parse(req.body);

      await this.addNote(content, nodeId ?? null);

      res.status(204).end();
    });

    this.router.put('/:id/note/:noteId', async (req, res) => {
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

      await this.updateNote(req.params.noteId, { content });
      res.status(204).end();
    });

    this.router.delete('/:id/note/:noteId', async (req, res) => {
      await this.removeNote(req.params.noteId);
      res.status(204).end();
    });

    this.router.put('/:id/note/:noteId/move', async (req, res) => {
      const { nodeId } = z.object({ nodeId: z.string().nullable() }).parse(req.body);

      await this.moveNote(req.params.noteId, nodeId);
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

    this.router.put('/:id/end', async (req, res) => {
      res.json(await this.endSession());
    });

    this.router.put('/:id/reopen', async (req, res) => {
      await this.reopenSession();
      res.status(204).end();
    });
  }

  private async listSessions({ offset, limit, ownerId }: { offset: number; limit: number; ownerId: string | null }) {
    const total = await this.sessionRepository.count({ ownerId });
    const sessions = await this.sessionRepository.findMany({ offset, limit, ownerId });

    return [
      total,
      sessions.map(({ id, subject, createdAt }) => ({
        id,
        subject,
        date: createdAt.toISOString(),
      })),
    ] as const;
  }

  private async createSession({
    model,
    language,
    demo,
    ownerId,
  }: {
    model: string;
    language: Shared.Language;
    demo?: boolean;
    ownerId: string | null;
  }) {
    const session = Session.create(this.generator, this.clock, { model, language, ownerId });

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

  private async addNode(label: string, parentId: string | null) {
    const session = this.getSessionInstance();

    session.addNode({ label, parentId });

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async updateNode(nodeId: string, changes: { label?: string; status?: TopicStatus }) {
    const session = this.getSessionInstance();

    session.updateNode(nodeId, changes);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async removeNode(nodeId: string) {
    const session = this.getSessionInstance();

    session.removeNode(nodeId);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async moveNode(nodeId: string, parentId: string | null) {
    const session = this.getSessionInstance();

    session.moveNode(nodeId, parentId);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async addNote(content: string, parentId: string | null) {
    const session = this.getSessionInstance();

    session.addNote({ content, parentId });

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async updateNote(noteId: string, changes: { content?: string }) {
    const session = this.getSessionInstance();

    session.updateNote(noteId, changes);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async removeNote(noteId: string) {
    const session = this.getSessionInstance();

    session.removeNote(noteId);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async moveNote(noteId: string, parentId: string | null) {
    const session = this.getSessionInstance();

    session.moveNote(noteId, parentId);

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

  private async endSession() {
    const session = this.getSessionInstance();

    const summary = await this.assistant.generateSummary(session);

    session.end();

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);

    return summary;
  }

  private async reopenSession() {
    const session = this.getSessionInstance();

    session.reopen();

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }
}

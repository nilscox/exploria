import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { OutgoingMessage } from 'node:http';
import z from 'zod';

import { languages } from '../domain/i18n/index.ts';
import { mindmapEdgeTypes } from '../domain/mindmap.ts';
import { toSessionView } from '../domain/projections/session-view.ts';
import { Session, postures, type TopicStatus } from '../domain/session.ts';
import { defined } from '../utils.ts';
import { parsePagination } from './pagination.ts';
import { ServerSentEvent, type SseUiNotifier } from './sse.ts';

import type { Clock } from '../adapters/clock.ts';
import type { Generator } from '../adapters/generator.ts';
import type { SessionRepository } from '../database/session-repository.ts';
import type { IAssistant } from '../domain/assistant.ts';
import type { MindmapEdgeType } from '../domain/mindmap.ts';
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

    this.router.post('/:id/topic', async (req, res) => {
      const { topic } = z.object({ topic: z.string().min(1).max(64) }).parse(req.body);

      await this.addTopic(topic);

      res.status(204).end();
    });

    this.router.delete('/:id/topic/:topicId', async (req, res) => {
      await this.removeTopic(req.params.topicId);
      res.status(204).end();
    });

    this.router.put('/:id/topic/:topicId', async (req, res) => {
      const { label, status } = z
        .object({
          label: z.string().min(1).max(64).optional(),
          status: z.enum(['pending', 'in_progress', 'done']).optional(),
        })
        .parse(req.body);

      await this.updateTopic(req.params.topicId, { label, status });
      res.status(204).end();
    });

    this.router.post('/:id/mindmap/node', async (req, res) => {
      const { label, parentId, edgeType } = z
        .object({
          label: z.string().min(1).max(64),
          parentId: z.string().optional(),
          edgeType: z.enum(mindmapEdgeTypes).optional(),
        })
        .parse(req.body);

      await this.addMindmapNode({ label, parentId, edgeType });

      res.status(204).end();
    });

    this.router.put('/:id/mindmap/node/:nodeId', async (req, res) => {
      const { label } = z.object({ label: z.string().min(1).max(64) }).parse(req.body);

      await this.updateMindmapNode(req.params.nodeId, label);

      res.status(204).end();
    });

    this.router.delete('/:id/mindmap/node/:nodeId', async (req, res) => {
      await this.removeMindmapNode(req.params.nodeId);
      res.status(204).end();
    });

    this.router.post('/:id/mindmap/edge', async (req, res) => {
      const { source, target, type } = z
        .object({
          source: z.string(),
          target: z.string(),
          type: z.enum(mindmapEdgeTypes),
        })
        .parse(req.body);

      await this.connectMindmapNodes(source, target, type);

      res.status(204).end();
    });

    this.router.delete('/:id/mindmap/edge/:edgeId', async (req, res) => {
      await this.removeMindmapEdge(req.params.edgeId);
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

  private async addTopic(label: string) {
    const session = this.getSessionInstance();

    session.addTopic({ label });

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async removeTopic(topicId: string) {
    const session = this.getSessionInstance();

    session.removeTopic(topicId);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async updateTopic(topicId: string, changes: { label?: string; status?: TopicStatus }) {
    const session = this.getSessionInstance();

    session.updateTopic(topicId, changes);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async addMindmapNode(params: { label: string; parentId?: string; edgeType?: MindmapEdgeType }) {
    const session = this.getSessionInstance();

    session.addMindmapNode(params);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async updateMindmapNode(nodeId: string, label: string) {
    const session = this.getSessionInstance();

    session.updateMindmapNode(nodeId, { label });

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async removeMindmapNode(nodeId: string) {
    const session = this.getSessionInstance();

    session.removeMindmapNode(nodeId);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async connectMindmapNodes(source: string, target: string, type: MindmapEdgeType) {
    const session = this.getSessionInstance();

    session.connectMindmapNodes(source, target, type);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async removeMindmapEdge(edgeId: string) {
    const session = this.getSessionInstance();

    session.removeMindmapEdge(edgeId);

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

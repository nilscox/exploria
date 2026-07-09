import express from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { OutgoingMessage } from 'node:http';
import z from 'zod';

import { languages } from '../domain/i18n/index.ts';
import { toSessionView } from '../domain/projections/session-view.ts';
import { Session, intensities, messageLengths, postures, type TopicStatus } from '../domain/session.ts';
import { assert, defined } from '../utils.ts';
import { parsePagination } from './pagination.ts';
import { ServerSentEvent, SseUiNotifier } from './sse.ts';
import { getUser } from './user-context.ts';

import type { Clock } from '../adapters/clock.ts';
import type { Generator } from '../adapters/generator.ts';
import type { SessionRepository } from '../database/session-repository.ts';
import type { Dependencies } from '../di.ts';
import type { IAssistant } from '../domain/assistant.ts';
import type { SummaryGenerator } from '../domain/summary-generator.ts';
import type { EventBus } from '../event-bus.ts';
import type { Shared } from '../shared.ts';

export class SessionController {
  private readonly generator: Generator;
  private readonly clock: Clock;
  private readonly events: EventBus;
  private readonly uiNotifier: SseUiNotifier;
  private readonly sessionRepository: SessionRepository;
  private readonly assistant: IAssistant;
  private readonly summaryGenerator: SummaryGenerator;

  public router = express.Router();

  private sessionContext = new AsyncLocalStorage<Session>();

  private getSessionInstance() {
    return defined(this.sessionContext.getStore());
  }

  constructor({
    generator,
    clock,
    events,
    uiNotifier,
    assistant,
    summaryGenerator,
    sessionRepository,
  }: Dependencies<
    'generator' | 'clock' | 'events' | 'uiNotifier' | 'assistant' | 'summaryGenerator' | 'sessionRepository'
  >) {
    assert(uiNotifier instanceof SseUiNotifier);

    this.generator = generator;
    this.clock = clock;
    this.events = events;
    this.uiNotifier = uiNotifier;
    this.assistant = assistant;
    this.summaryGenerator = summaryGenerator;
    this.sessionRepository = sessionRepository;

    this.router.param('id', async (req, res, next, id: string) => {
      const user = getUser();
      const session = await this.sessionRepository.find(id);

      if (!session) {
        res.status(404).end();
        return;
      }

      const isPublic = session.ownerId === null;
      const isOwner = session.ownerId === (user?.id ?? null);

      if (!isPublic && !isOwner) {
        res.status(404).end();
        return;
      }

      this.sessionContext.run(session, next);
    });

    this.router.get('/', async (req, res) => {
      const user = getUser();
      const { page, limit, offset } = parsePagination(req.query);
      const [total, sessions] = await this.listSessions({ offset, limit, ownerId: user?.id ?? null });

      res.setHeader('X-Page', page);
      res.setHeader('X-Total-Pages', Math.ceil(total / limit));
      res.json(sessions);
    });

    this.router.post('/', async (req, res) => {
      const user = getUser();

      const { model, language } = z
        .object({
          model: z.string().min(1),
          language: z.enum(languages).default('en'),
        })
        .parse(req.body);

      res.status(201).send(await this.createSession({ model, language, ownerId: user?.id ?? null }));
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

    this.router.put('/:id/intensity', async (req, res) => {
      const { intensity } = z.object({ intensity: z.enum(intensities) }).parse(req.body);

      await this.setIntensity(intensity);

      res.status(204).end();
    });

    this.router.put('/:id/message-length', async (req, res) => {
      const { messageLength } = z.object({ messageLength: z.enum(messageLengths) }).parse(req.body);

      await this.setMessageLength(messageLength);

      res.status(204).end();
    });

    this.router.post('/:id/topic', async (req, res) => {
      const { label, parentId } = z
        .object({ label: z.string().min(1).max(64), parentId: z.string().nullish() })
        .parse(req.body);

      await this.addTopic(label, parentId ?? null);

      res.status(204).end();
    });

    this.router.put('/:id/topic/:topicId', async (req, res) => {
      const { label, status, summary } = z
        .object({
          label: z.string().min(1).max(64).optional(),
          status: z.enum(['pending', 'in_progress', 'done']).optional(),
          summary: z.string().optional(),
        })
        .parse(req.body);

      await this.updateTopic(req.params.topicId, { label, status, summary });
      res.status(204).end();
    });

    this.router.delete('/:id/topic/:topicId', async (req, res) => {
      await this.removeTopic(req.params.topicId);
      res.status(204).end();
    });

    this.router.put('/:id/topic/:topicId/move', async (req, res) => {
      const { parentId } = z.object({ parentId: z.string().nullable() }).parse(req.body);

      await this.moveTopic(req.params.topicId, parentId);
      res.status(204).end();
    });

    this.router.post('/:id/note', async (req, res) => {
      const { title, content, topicId } = z
        .object({ title: z.string().min(1).max(64), content: z.string().min(1), topicId: z.string().nullish() })
        .parse(req.body);

      await this.addNote(title, content, topicId ?? null);

      res.status(204).end();
    });

    this.router.put('/:id/note/:noteId', async (req, res) => {
      const { title, content } = z
        .object({ title: z.string().min(1).max(64).optional(), content: z.string().min(1).optional() })
        .parse(req.body);

      await this.updateNote(req.params.noteId, { title, content });
      res.status(204).end();
    });

    this.router.delete('/:id/note/:noteId', async (req, res) => {
      await this.removeNote(req.params.noteId);
      res.status(204).end();
    });

    this.router.put('/:id/note/:noteId/move', async (req, res) => {
      const { topicId } = z.object({ topicId: z.string().nullable() }).parse(req.body);

      await this.moveNote(req.params.noteId, topicId);
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

    this.router.post('/:id/question/:questionId/answer', async (req, res) => {
      const { optionId } = z.object({ optionId: z.string().min(1) }).parse(req.body);
      await this.selectAnswer(req.params.questionId, optionId);
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
    ownerId,
  }: {
    model: string;
    language: Shared.Language;
    ownerId: string | null;
  }) {
    const session = Session.create(this.generator, this.clock, { model, language, ownerId });

    await this.sessionRepository.insert(session);
    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);

    return session.id;
  }

  private makeCommit(session: Session) {
    return async () => {
      const committed = await this.sessionRepository.save(session);

      this.events.emit(...committed);
    };
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

  private async setIntensity(intensity: (typeof intensities)[number]) {
    const session = this.getSessionInstance();

    session.setIntensity(intensity);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async setMessageLength(messageLength: (typeof messageLengths)[number]) {
    const session = this.getSessionInstance();

    session.setMessageLength(messageLength);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async addTopic(label: string, parentId: string | null) {
    const session = this.getSessionInstance();

    session.addTopic({ label, parentId });

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async updateTopic(topicId: string, changes: { label?: string; status?: TopicStatus; summary?: string }) {
    const session = this.getSessionInstance();

    session.updateTopic(topicId, changes);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async removeTopic(topicId: string) {
    const session = this.getSessionInstance();

    session.removeTopic(topicId);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async moveTopic(topicId: string, parentId: string | null) {
    const session = this.getSessionInstance();

    session.moveTopic(topicId, parentId);

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async addNote(title: string, content: string, parentId: string | null) {
    const session = this.getSessionInstance();

    session.addNote({ title, content, parentId });

    const committed = await this.sessionRepository.save(session);

    this.events.emit(...committed);
  }

  private async updateNote(noteId: string, changes: { title?: string; content?: string }) {
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

  private async selectAnswer(questionId: string, optionId: string) {
    const session = this.getSessionInstance();
    const commit = this.makeCommit(session);

    session.selectAnswer(questionId, optionId);
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

    const summary = await this.summaryGenerator.generate(session);

    session.addSummary(summary);
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

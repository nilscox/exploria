import { eq, inArray } from 'drizzle-orm';

import { Session, type Message, type Note, type SessionEvent, type Timer, type Topic } from '../domain/session';
import { assert } from '../utils';
import { domainEvents, messages, notes, sessions, toolCalls, topics } from './schema';

import type { drizzleDatabase } from '.';
import type { Clock, Generator } from '../di';
import type { UiNotifier } from '../domain/ui-notifier';
import type { MessageSelect, NoteSelect, SessionSelect, ToolCallInsert, ToolCallSelect, TopicSelect } from './model';

export class SessionRepository {
  private generator: Generator;
  private clock: Clock;
  private uiNotifier: UiNotifier;
  private db: typeof drizzleDatabase;

  constructor(generator: Generator, clock: Clock, uiNotifier: UiNotifier, database: typeof drizzleDatabase) {
    this.clock = clock;
    this.uiNotifier = uiNotifier;
    this.generator = generator;
    this.db = database;
  }

  async insert(session: Session) {
    await this.db.insert(sessions).values({
      id: session.id,
      model: session.model,
      subject: session.subject,
      timerDuration: session.timer?.duration,
      timerStartedAt: SessionRepository.date(session.timer?.startedAt),
      timerPausedAt: SessionRepository.date(session.timer?.pausedAt),
    });
  }

  async save(session: Session) {
    const db = this.db;

    const insertTopics = async (values: Topic[]) => {
      await db.insert(topics).values(values.map((topic) => ({ sessionId: session.id, ...topic })));
    };

    const insertNotes = async (values: Note[]) => {
      await db.insert(notes).values(values.map((note) => ({ sessionId: session.id, ...note })));
    };

    const updateTimer = async () => {
      await db
        .update(sessions)
        .set({
          timerDuration: session.timer?.duration ?? null,
          timerStartedAt: SessionRepository.date(session.timer?.startedAt),
          timerPausedAt: SessionRepository.date(session.timer?.pausedAt),
        })
        .where(eq(sessions.id, session.id));
    };

    const handlers: Partial<{
      [Event in SessionEvent as Event['type']]: (event: Event) => Promise<void>;
    }> = {
      ModelChanged: async ({ model }) => {
        await db.update(sessions).set({ model }).where(eq(sessions.id, session.id));
      },

      PlanInitialized: async ({ subject, topics: topicsToInsert }) => {
        await db.update(sessions).set({ subject }).where(eq(sessions.id, session.id));
        await db.delete(topics).where(eq(topics.sessionId, session.id));
        await insertTopics(topicsToInsert);
      },

      SubjectChanged: async ({ subject }) => {
        await db.update(sessions).set({ subject }).where(eq(sessions.id, session.id));
      },

      TopicAdded: async ({ topic }) => {
        await insertTopics([topic]);
      },

      TopicRemoved: async ({ topicId }) => {
        await db.delete(topics).where(eq(topics.id, topicId));
      },

      TopicLabelChanged: async ({ topicId, label }) => {
        await db.update(topics).set({ label }).where(eq(topics.id, topicId));
      },

      TopicStatusChanged: async ({ topicId, status }) => {
        await db.update(topics).set({ status }).where(eq(topics.id, topicId));
      },

      NoteAdded: async ({ note }) => {
        await insertNotes([note]);
      },

      NoteRemoved: async ({ noteId }) => {
        await db.delete(notes).where(eq(topics.id, noteId));
      },

      NoteContentChanged: async ({ noteId, content }) => {
        await db.update(notes).set({ content }).where(eq(topics.id, noteId));
      },

      TimerStarted: updateTimer,
      TimerCleared: updateTimer,
      TimerPaused: updateTimer,
      TimerResumed: updateTimer,

      MessageAdded: async ({ message }) => {
        await db.insert(messages).values({
          ...message,
          sessionId: session.id,
          toolCallId: message.role === 'tool' ? message.toolCallId : null,
          createdAt: new Date(message.date),
        });

        if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
          await db.insert(toolCalls).values(
            message.toolCalls.map(
              (toolCall): ToolCallInsert => ({
                ...toolCall,
                messageId: message.id,
              }),
            ),
          );
        }
      },
    };

    const events = session.peekDomainEvents();

    await Promise.all(
      events.map(async (event) => {
        if (event.type in handlers) {
          const handler = handlers[event.type] as (event: SessionEvent) => Promise<void>;
          await handler(event);
        }

        const { aggregateId, aggregateType, occurredAt, type, ...payload } = event;

        await db.insert(domainEvents).values({
          id: this.generator.id(),
          aggregateId,
          aggregateType,
          occurredAt,
          type,
          payload,
        });
      }),
    );
  }

  async find(id: string) {
    const session = await this.db.query.sessions.findFirst({
      where: { id },
      with: {
        notes: true,
        topics: true,
        messages: { with: { toolCalls: true }, orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      return null;
    }

    return this.mapSession(session);
  }

  async findMany() {
    return this.db.query.sessions.findMany();
  }

  async delete(id: string) {
    await this.db
      .delete(toolCalls)
      .where(
        inArray(toolCalls.id, this.db.select({ id: messages.id }).from(messages).where(eq(messages.sessionId, id))),
      );

    await Promise.all([
      ...[topics, notes, messages].map((table) => this.db.delete(table).where(eq(table.sessionId, id))),
      this.db.delete(domainEvents).where(eq(domainEvents.aggregateId, id)),
    ]);

    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  async findEvents(sessionId: string) {
    return this.db.query.domainEvents.findMany({
      where: { aggregateType: 'Session', aggregateId: sessionId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  private static date(value: string | undefined) {
    return value ? new Date(value) : null;
  }

  private mapSession(
    model: SessionSelect & {
      topics: TopicSelect[];
      notes: NoteSelect[];
      messages: Array<MessageSelect & { toolCalls: ToolCallSelect[] }>;
    },
  ): Session {
    const mapTopic = ({ id, label, status }: TopicSelect): Topic => {
      return { id, label, status };
    };

    const mapNote = ({ id, content }: NoteSelect): Note => {
      return { id, content };
    };

    const getTimer = ({ timerDuration, timerStartedAt, timerPausedAt }: SessionSelect): Timer | null => {
      if (!timerDuration || !timerStartedAt) {
        return null;
      }

      return {
        duration: timerDuration,
        startedAt: timerStartedAt.toISOString(),
        pausedAt: timerPausedAt?.toISOString(),
      };
    };

    const mapMessage = ({
      id,
      role,
      content,
      model,
      toolCalls,
      toolCallId,
      createdAt,
    }: MessageSelect & { toolCalls: ToolCallSelect[] }): Message => {
      const date = createdAt.toISOString();

      if (role === 'system' || role === 'user') {
        return { id, date, role, content };
      }

      if (role === 'tool') {
        assert(typeof toolCallId === 'string');
        return { id, role, date, content, toolCallId };
      }

      assert(typeof model === 'string');

      return {
        id,
        role,
        date,
        content,
        model,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    };

    return Session.from(this.generator, this.clock, this.uiNotifier, {
      id: model.id,
      model: model.model,
      subject: model.subject,
      topics: model.topics.map(mapTopic),
      notes: model.notes.map(mapNote),
      timer: getTimer(model),
      messages: model.messages.map(mapMessage),
      discussionPaths: [],
    });
  }
}

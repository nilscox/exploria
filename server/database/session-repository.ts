import { eq, inArray } from 'drizzle-orm';

import { di } from '../di';
import { Session } from '../session';
import { assert } from '../utils';
import { messages, notes, sessionEvents, sessions, toolCalls, topics } from './schema';

import type { Message, Note, SessionEvent, Timer, Topic } from '../../shared';
import type {
  MessageSelect,
  NoteSelect,
  SessionEventSelect,
  SessionSelect,
  ToolCallInsert,
  ToolCallSelect,
  TopicSelect,
} from './model';

export class SessionRepository {
  private get db() {
    return di.resolve('database');
  }

  async insert(session: Session) {
    await this.db.insert(sessions).values({
      id: session.id,
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

    const handlers: Partial<{ [Event in SessionEvent as Event['type']]: (event: Event) => Promise<void> }> = {
      planInitialized: async ({ subject, topics: topicsToInsert }) => {
        await db.update(sessions).set({ subject }).where(eq(sessions.id, session.id));
        await db.delete(topics).where(eq(topics.sessionId, session.id));
        await insertTopics(topicsToInsert);
      },

      subjectChanged: async ({ subject }) => {
        await db.update(sessions).set({ subject }).where(eq(sessions.id, session.id));
      },

      topicAdded: async ({ topic }) => {
        await insertTopics([topic]);
      },

      topicRemoved: async ({ topicId }) => {
        await db.delete(topics).where(eq(topics.id, topicId));
      },

      topicLabelChanged: async ({ topicId, label }) => {
        await db.update(topics).set({ label }).where(eq(topics.id, topicId));
      },

      topicStatusChanged: async ({ topicId, status }) => {
        await db.update(topics).set({ status }).where(eq(topics.id, topicId));
      },

      noteAdded: async ({ note }) => {
        await insertNotes([note]);
      },

      noteRemoved: async ({ noteId }) => {
        await db.delete(notes).where(eq(topics.id, noteId));
      },

      noteContentChanged: async ({ noteId, content }) => {
        await db.update(notes).set({ content }).where(eq(topics.id, noteId));
      },

      timerStarted: updateTimer,
      timerCleared: updateTimer,
      timerPaused: updateTimer,
      timerResumed: updateTimer,

      messageAdded: async ({ message }) => {
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

        const { id, type, date, ...payload } = event;

        await db.insert(sessionEvents).values({ id, sessionId: session.id, type, date: new Date(date), payload });
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
        events: true,
      },
    });

    if (!session) {
      return null;
    }

    return Session.from(SessionRepository.mapSession(session));
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

    await Promise.all(
      [topics, notes, messages, sessionEvents].map((table) => this.db.delete(table).where(eq(table.sessionId, id))),
    );

    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  private static date(value: string | undefined) {
    return value ? new Date(value) : null;
  }

  private static mapSession(
    model: SessionSelect & {
      topics: TopicSelect[];
      notes: NoteSelect[];
      messages: Array<MessageSelect & { toolCalls: ToolCallSelect[] }>;
      events: SessionEventSelect[];
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
      toolCalls,
      toolCallId,
      createdAt,
    }: MessageSelect & { toolCalls: ToolCallSelect[] }): Message => {
      const date = createdAt.toISOString();

      if (role === 'system' || role === 'user' || (role === 'assistant' && toolCalls.length === 0)) {
        return { id, date, role, content };
      }

      if (role === 'tool') {
        assert(typeof toolCallId === 'string');
        return { id, role, date, content, toolCallId };
      }

      return { id, role, date, content, toolCalls };
    };

    return Session.from({
      id: model.id,
      subject: model.subject,
      topics: model.topics.map(mapTopic),
      notes: model.notes.map(mapNote),
      timer: getTimer(model),
      messages: model.messages.map(mapMessage),
      discussionPaths: [],
    });
  }
}

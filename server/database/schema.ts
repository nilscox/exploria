import { defineRelations } from 'drizzle-orm';
import * as p from 'drizzle-orm/pg-core';

import type { SessionEvent } from '../../shared';
import type { DistributiveOmit } from '../utils';

export const sessions = p.pgTable('sessions', {
  id: p.varchar({ length: 16 }).primaryKey(),
  subject: p.varchar({ length: 255 }).notNull(),
  timerDuration: p.integer(),
  timerStartedAt: p.timestamp(),
  timerPausedAt: p.timestamp(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const topicStatus = p.pgEnum('topic_status', ['pending', 'in_progress', 'done']);

export const topics = p.pgTable('topics', {
  id: p.varchar({ length: 16 }).primaryKey(),
  sessionId: p
    .varchar({ length: 16 })
    .notNull()
    .references(() => sessions.id),
  label: p.varchar({ length: 32 }).notNull(),
  status: topicStatus().notNull(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const notes = p.pgTable('notes', {
  id: p.varchar({ length: 16 }).primaryKey(),
  sessionId: p
    .varchar({ length: 16 })
    .notNull()
    .references(() => sessions.id),
  content: p.text().notNull(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const role = p.pgEnum('role', ['system', 'assistant', 'user', 'tool']);

export const messages = p.pgTable('messages', {
  id: p.varchar({ length: 16 }).primaryKey(),
  role: role().notNull(),
  sessionId: p
    .varchar({ length: 16 })
    .notNull()
    .references(() => sessions.id),
  content: p.text().notNull(),
  toolCallId: p.varchar({ length: 32 }),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const toolCalls = p.pgTable('tool_calls', {
  id: p.varchar({ length: 32 }).primaryKey(),
  messageId: p
    .varchar({ length: 16 })
    .notNull()
    .references(() => messages.id),
  name: p.varchar({ length: 32 }).notNull(),
  arguments: p.jsonb().notNull(),
  result: p.jsonb(),
  error: p.jsonb(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const sessionEvents = p.pgTable('session_events', {
  id: p.varchar({ length: 16 }).primaryKey(),
  sessionId: p
    .varchar({ length: 16 })
    .notNull()
    .references(() => sessions.id),
  date: p.timestamp().notNull(),
  type: p.varchar({ length: 32 }).$type<SessionEvent['type']>().notNull(),
  payload: p.json().$type<DistributiveOmit<SessionEvent, 'id' | 'type' | 'date'>>().notNull(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const relations = defineRelations({ sessions, topics, notes, messages, toolCalls, sessionEvents }, (r) => ({
  sessions: {
    topics: r.many.topics(),
    notes: r.many.notes(),
    messages: r.many.messages(),
    events: r.many.sessionEvents(),
  },

  topics: {
    session: r.one.sessions({
      from: r.topics.sessionId,
      to: r.sessions.id,
      optional: false,
    }),
  },

  notes: {
    session: r.one.sessions({
      from: r.notes.sessionId,
      to: r.sessions.id,
      optional: false,
    }),
  },

  messages: {
    session: r.one.sessions({
      from: r.messages.sessionId,
      to: r.sessions.id,
      optional: false,
    }),
    toolCalls: r.many.toolCalls(),
  },

  toolCalls: {
    message: r.one.messages({
      from: r.toolCalls.messageId,
      to: r.messages.id,
      optional: false,
    }),
  },

  sessionEvents: {
    session: r.one.sessions({
      from: r.sessionEvents.sessionId,
      to: r.sessions.id,
      optional: false,
    }),
  },
}));

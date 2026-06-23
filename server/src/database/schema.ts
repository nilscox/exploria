import { defineRelations } from 'drizzle-orm';
import * as p from 'drizzle-orm/pg-core';

export const sessions = p.pgTable('sessions', {
  id: p.varchar({ length: 8 }).primaryKey(),
  model: p.varchar({ length: 64 }).notNull(),
  subject: p.varchar({ length: 255 }).notNull(),
  timerDuration: p.integer(),
  timerStartedAt: p.timestamp(),
  timerPausedAt: p.timestamp(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const topicStatus = p.pgEnum('topic_status', ['pending', 'in_progress', 'done']);

export const topics = p.pgTable('topics', {
  id: p.varchar({ length: 8 }).primaryKey(),
  sessionId: p
    .varchar({ length: 8 })
    .notNull()
    .references(() => sessions.id),
  label: p.varchar({ length: 64 }).notNull(),
  status: topicStatus().notNull(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const notes = p.pgTable('notes', {
  id: p.varchar({ length: 8 }).primaryKey(),
  sessionId: p
    .varchar({ length: 8 })
    .notNull()
    .references(() => sessions.id),
  content: p.text().notNull(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const role = p.pgEnum('role', ['system', 'assistant', 'user', 'tool']);

export const domainEvents = p.pgTable('domain_events', {
  id: p.varchar({ length: 8 }).primaryKey(),
  aggregateType: p.varchar({ length: 32 }).notNull(),
  aggregateId: p.varchar({ length: 8 }).notNull(),
  occurredAt: p.timestamp({ precision: 6 }).notNull(),
  type: p.varchar({ length: 32 }).notNull(),
  payload: p.jsonb().$type<object>().notNull(),
});

export const relations = defineRelations({ sessions, topics, notes, domainEvents }, (r) => ({
  sessions: {
    topics: r.many.topics(),
    notes: r.many.notes(),
    events: r.many.domainEvents({
      from: r.sessions.id,
      to: r.domainEvents.aggregateId,
      where: {
        aggregateType: 'Session',
      },
    }),
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
}));

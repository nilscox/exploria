import { defineRelations } from 'drizzle-orm';
import * as p from 'drizzle-orm/pg-core';

export const users = p.pgTable('users', {
  id: p.varchar({ length: 8 }).primaryKey(),
  name: p.varchar({ length: 255 }).notNull(),
  loginToken: p.varchar({ length: 64 }).notNull().unique(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const sessions = p.pgTable('sessions', {
  id: p.varchar({ length: 8 }).primaryKey(),
  ownerId: p.varchar({ length: 8 }).references(() => users.id),
  model: p.varchar({ length: 64 }).notNull(),
  subject: p.varchar({ length: 255 }).notNull(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const domainEvents = p.pgTable('domain_events', {
  position: p.serial(),
  id: p.varchar({ length: 8 }).primaryKey(),
  aggregateType: p.varchar({ length: 32 }).notNull(),
  aggregateId: p.varchar({ length: 8 }).notNull(),
  occurredAt: p.timestamp({ precision: 6 }).notNull(),
  type: p.varchar({ length: 32 }).notNull(),
  payload: p.jsonb().$type<object>().notNull(),
});

export const relations = defineRelations({ sessions, domainEvents, users }, (r) => ({
  sessions: {
    events: r.many.domainEvents({
      from: r.sessions.id,
      to: r.domainEvents.aggregateId,
      where: {
        aggregateType: 'Session',
      },
    }),
  },
}));

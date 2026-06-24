import { defineRelations } from 'drizzle-orm';
import * as p from 'drizzle-orm/pg-core';

export const sessions = p.pgTable('sessions', {
  id: p.varchar({ length: 8 }).primaryKey(),
  model: p.varchar({ length: 64 }).notNull(),
  subject: p.varchar({ length: 255 }).notNull(),
  createdAt: p.timestamp({ precision: 6 }).defaultNow().notNull(),
});

export const domainEvents = p.pgTable('domain_events', {
  id: p.varchar({ length: 8 }).primaryKey(),
  aggregateType: p.varchar({ length: 32 }).notNull(),
  aggregateId: p.varchar({ length: 8 }).notNull(),
  occurredAt: p.timestamp({ precision: 6 }).notNull(),
  type: p.varchar({ length: 32 }).notNull(),
  payload: p.jsonb().$type<object>().notNull(),
});

export const relations = defineRelations({ sessions, domainEvents }, (r) => ({
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

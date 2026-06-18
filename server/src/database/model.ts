import type { domainEvents, messages, notes, sessions, toolCalls, topics } from './schema';

export type SessionSelect = typeof sessions.$inferSelect;
export type SessionInsert = typeof sessions.$inferInsert;

export type TopicSelect = typeof topics.$inferSelect;
export type TopicInsert = typeof topics.$inferInsert;

export type NoteSelect = typeof notes.$inferSelect;
export type NoteInsert = typeof notes.$inferInsert;

export type MessageSelect = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;

export type ToolCallSelect = typeof toolCalls.$inferSelect;
export type ToolCallInsert = typeof toolCalls.$inferInsert;

export type DomainEventSelect = typeof domainEvents.$inferSelect;
export type DomainEventInsert = typeof domainEvents.$inferInsert;

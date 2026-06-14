import type OpenAI from 'openai';

export type Session = {
  plan: Plan;
  events: SessionEvent[];
  notes: Note[];
  messages: OpenAI.ChatCompletionMessageParam[];
};

export type SessionEvent =
  | {
      type: 'plan_updated';
      plan: Plan;
    }
  | {
      type: 'notes_updated';
      notes: Note[];
    }
  | {
      type: 'message_added';
      message: Message;
    };

export type SessionEventType = SessionEvent['type'];

export type GetSessionEvent<Type extends SessionEventType> = Extract<SessionEvent, { type: Type }>;

export const sessionEventTypes = [
  'message_added',
  'plan_updated',
  'notes_updated',
] as const satisfies SessionEventType[];

export function isSessionEventType(value: string): value is SessionEventType {
  return (sessionEventTypes as string[]).includes(value);
}

export type Plan = {
  topics: Topic[];
};

export type Topic = {
  id: string;
  label: string;
  status: TopicStatus;
};

export type Note = {
  id: string;
  content: string;
};

export type TopicStatus = 'pending' | 'in_progress' | 'done';

export type Message = {
  role: 'assistant' | 'user';
  content: string;
};

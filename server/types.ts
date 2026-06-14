import type OpenAI from 'openai';

export type Session = {
  plan: Plan;
  events: SessionEvent[];
  messages: OpenAI.ChatCompletionMessageParam[];
};

export type SessionEvent =
  | {
      type: 'plan_updated';
      plan: Plan;
    }
  | {
      type: 'topic_added';
      topic: Topic;
    }
  | {
      type: 'topic_updated';
      id: string;
      label?: string;
      status?: TopicStatus;
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
  'topic_added',
  'topic_updated',
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

export type TopicStatus = 'pending' | 'active' | 'done';

export type Message = {
  role: 'assistant' | 'user';
  content: string;
};

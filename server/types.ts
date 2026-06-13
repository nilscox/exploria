import type OpenAI from 'openai';

export type Session = {
  plan: Plan;
  messages: Message[];
};

export type SessionEvent =
  | {
      type: 'plan_updated';
      plan: Plan;
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

export type Plan = {
  topics: Topic[];
};

export type Topic = {
  id: string;
  label: string;
  status: TopicStatus;
};

export type TopicStatus = 'pending' | 'active' | 'done';

export type Message = OpenAI.ChatCompletionMessageParam;

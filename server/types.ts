import type OpenAI from 'openai';

export type Session = {
  plan: Plan;
  messages: Message[];
};

export type Plan = {
  topics: Topic[];
};

export type Topic = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
};

export type Message = OpenAI.ChatCompletionMessageParam;

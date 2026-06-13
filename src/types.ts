import OpenAI from 'openai';

export type Topic = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
};

export type Plan = {
  topics: Topic[];
};

export type Message = OpenAI.ChatCompletionMessageParam;

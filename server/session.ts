import EventEmitter from 'node:events';
import type OpenAI from 'openai';

import { sessionEventTypes, type Plan, type SessionEvent, type Topic } from './types';
import { has } from './utils';

type EventsToEmitterEventMap<T extends { type: string }> = {
  [Type in T['type']]: [Omit<Extract<T, { type: Type }>, 'type'>];
};

export class Session extends EventEmitter<EventsToEmitterEventMap<SessionEvent>> {
  private _plan: Plan;
  private _sessionEvents: SessionEvent[];
  private _messages: OpenAI.ChatCompletionMessageParam[];

  get plan() {
    return this._plan;
  }

  get events() {
    return this._sessionEvents;
  }

  get messages() {
    return this._messages;
  }

  constructor(instructions: string) {
    super();

    this._plan = { topics: [] };
    this._sessionEvents = [];
    this._messages = [{ role: 'system', content: instructions }];

    for (const type of sessionEventTypes) {
      this.addListener(type, (event) => {
        this._sessionEvents.push({ type, ...event } as SessionEvent);
      });
    }
  }

  static from(data: { plan: Plan; events: SessionEvent[]; messages: OpenAI.ChatCompletionMessageParam[] }) {
    const session = new Session('');

    session._plan = data.plan;
    session._sessionEvents = data.events;
    session._messages = data.messages;

    return session;
  }

  setPlan(plan: Plan) {
    this._plan = plan;
    this.emit('plan_updated', { plan });
  }

  addTopic(topic: Topic) {
    this._plan.topics.push(topic);
    this.emit('topic_added', { topic });
  }

  private getTopic(id: string) {
    const topic = this.plan.topics.find((topic) => topic.id === id);

    if (!topic) {
      throw new Error(`Cannot find topic '${id}'`);
    }

    return topic;
  }

  setCurrentTopic(topicId: string) {
    const topic = this.getTopic(topicId);

    this.emit('topic_added', { topic });

    return topic;
  }

  updateTopic(id: string, updates: Partial<Omit<Topic, 'id'>>) {
    const topic = this.getTopic(id);

    if (updates.status === 'in_progress') {
      const inProgress = this.plan.topics.find(has('status', 'in_progress'));

      if (inProgress) {
        inProgress.status = 'done';
      }
    }

    if (updates.label) topic.label = updates.label;
    if (updates.status) topic.status = updates.status;

    this.emit('topic_updated', { id, ...updates });

    return topic;
  }

  addMessage(message: OpenAI.ChatCompletionMessageParam) {
    this.messages.push(message);

    if (
      (message.role === 'assistant' || message.role === 'user') &&
      typeof message.content === 'string' &&
      message.content !== ''
    ) {
      this.emit('message_added', { message: { role: message.role, content: message.content } });
    }
  }

  serialize() {
    return {
      plan: this.plan,
      events: this.events,
      messages: this.messages,
    };
  }
}

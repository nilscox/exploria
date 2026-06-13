import EventEmitter from 'node:events';

import type { Message, Plan, SessionEvent, Topic } from './types';

export class Session extends EventEmitter<{
  [Type in SessionEvent['type']]: [Omit<Extract<SessionEvent, { type: Type }>, 'type'>];
}> {
  private _plan: Plan;
  private _messages: Message[];

  get plan() {
    return this._plan;
  }

  get messages() {
    return this._messages;
  }

  constructor(instructions: string) {
    super();

    this._plan = { topics: [] };
    this._messages = [{ role: 'system', content: instructions }];
  }

  updatePlan(plan: Plan) {
    this._plan = plan;
    this.emit('plan_updated', { plan });
  }

  updateTopic(id: string, updates: Partial<Omit<Topic, 'id'>>) {
    const topic = this.plan.topics.find((topic) => topic.id === id);

    if (!topic) {
      throw new Error('Cannot find topic');
    }

    Object.assign(topic, updates);

    this.emit('topic_updated', { id, ...updates });

    return topic;
  }

  addMessage(message: Message) {
    this.messages.push(message);
    this.emit('message_added', { message });
  }

  serialize() {
    return {
      plan: this.plan,
      messages: this.messages,
    };
  }
}

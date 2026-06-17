import type { DomainEvent } from '@exploria/shared';

import { di } from './di';
import { type DistributiveOmit } from './utils';

export class AggregateRoot<Event extends DomainEvent<string>> {
  protected _id: string;
  private _domainEvents: Event[] = [];

  constructor() {
    const generator = di.resolve('generator');

    this._id = generator.id();
  }

  protected emit(event: DistributiveOmit<Event, 'id' | 'entityId' | 'date'>) {
    const generator = di.resolve('generator');
    const dateAdapter = di.resolve('date');
    const date = dateAdapter.now().toISOString();

    this._domainEvents.push({
      id: generator.id(),
      entityId: this._id,
      date,
      ...event,
    } as Event);
  }

  pullDomainEvents() {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  peekDomainEvents() {
    return [...this._domainEvents];
  }
}

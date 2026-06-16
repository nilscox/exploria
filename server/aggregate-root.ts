import { di } from './di';
import { type DistributiveOmit, createId } from './utils';

import type { DomainEvent } from '../shared';

export class AggregateRoot<Event extends DomainEvent<string>> {
  protected _id: string;
  private _domainEvents: Event[] = [];

  constructor(id: string) {
    this._id = id;
  }

  protected emit(event: DistributiveOmit<Event, 'id' | 'entityId' | 'date'>) {
    const dateAdapter = di.resolve('date');
    const date = dateAdapter.now().toISOString();

    this._domainEvents.push({
      id: createId(),
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

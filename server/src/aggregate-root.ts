import type { DomainEvent } from '@exploria/shared';

import { type Clock, type Generator } from './di';
import { type DistributiveOmit } from './utils';

export class AggregateRoot<Event extends DomainEvent<string>> {
  protected readonly generator: Generator;
  protected readonly clock: Clock;

  protected _id: string;
  private _domainEvents: Event[] = [];

  constructor(generator: Generator, clock: Clock) {
    this.generator = generator;
    this.clock = clock;

    this._id = generator.id();
  }

  protected emit(event: DistributiveOmit<Event, 'id' | 'entityId' | 'date'>) {
    const date = this.clock.now().toISOString();

    this._domainEvents.push({
      id: this.generator.id(),
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

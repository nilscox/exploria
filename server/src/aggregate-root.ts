import type { Clock } from './adapters/clock';
import type { Generator } from './adapters/generator';

export type DomainEvent<Aggregate extends string = string, Type extends string = string> = {
  aggregateType: Aggregate;
  aggregateId: string;
  occurredAt: Date;
  type: Type;
};

export abstract class AggregateRoot<Event extends DomainEvent> {
  protected readonly generator: Generator;
  protected readonly clock: Clock;

  protected _id: string;
  private _domainEvents: Event[] = [];

  constructor(generator: Generator, clock: Clock) {
    this.generator = generator;
    this.clock = clock;

    this._id = generator.id();
  }

  protected abstract apply(event: Event): void;

  protected emit<Type extends Event['type']>(
    type: Type,
    payload: Omit<Extract<Event, { type: Type }>, 'occurredAt' | 'aggregateType' | 'aggregateId' | 'type'>,
  ) {
    const event = {
      aggregateType: this.constructor.name,
      aggregateId: this._id,
      occurredAt: this.clock.now(),
      type,
      ...payload,
    } as Extract<Event, { type: Type }>;

    this._domainEvents.push(structuredClone(event));
    this.apply(structuredClone(event));

    return event;
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

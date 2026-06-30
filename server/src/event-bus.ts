import { EventEmitter } from 'node:events';

import type { Logger } from './adapters/logger.ts';
import type { DomainEvent } from './aggregate-root.ts';

type EventHandler<Event extends DomainEvent = DomainEvent> = (event: Event) => void;

export class EventBus<BusEvent extends DomainEvent = DomainEvent> {
  private readonly logger: Logger;

  private emitter = new EventEmitter();

  constructor(logger: Logger) {
    this.logger = logger;
    this.emitter.setMaxListeners(2 << 8);
  }

  emit(...events: BusEvent[]) {
    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      this.logger.log('[EVT]', event.aggregateType, event.aggregateId, event.type, event);
      this.emitter.emit(event.type, event);
    }

    this.emitter.emit('$batch', events);
  }

  addListener<Type extends BusEvent['type']>(type: Type, listener: EventHandler<Extract<BusEvent, { type: Type }>>) {
    const wrapped = this.wrapListener(listener);

    this.emitter.addListener(type, wrapped);

    return () => {
      this.emitter.removeListener(type, wrapped);
    };
  }

  subscribe(listener: (events: BusEvent[]) => void): () => void {
    const wrapped = this.wrapListener(listener);

    this.emitter.addListener('$batch', wrapped);

    return () => {
      this.emitter.removeListener('$batch', wrapped);
    };
  }

  private wrapListener<Args extends unknown[]>(listener: (...args: Args) => void | Promise<void>) {
    return async (...args: Args) => {
      try {
        await listener(...args);
      } catch (error) {
        console.error(error);
      }
    };
  }
}

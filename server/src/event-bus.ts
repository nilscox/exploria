import { EventEmitter } from 'node:events';

import type { Logger } from './adapters/logger';
import type { DomainEvent } from './aggregate-root';

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
    this.emitter.addListener(type, listener);

    return () => {
      this.emitter.removeListener(type, listener);
    };
  }

  subscribe(listener: (events: BusEvent[]) => void): () => void {
    this.emitter.addListener('$batch', listener);

    return () => {
      this.emitter.removeListener('$batch', listener);
    };
  }
}

import { EventEmitter } from 'node:events';

import type { DomainEvent } from '../shared';

export class Events {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(2 << 8);
  }

  emit(...events: DomainEvent[]) {
    events.forEach((event) => {
      this.emitter.emit(event.type, event);
    });
  }

  addListener<Event extends DomainEvent>(type: string, listener: (event: Event) => void) {
    this.emitter.addListener(type, listener);

    return () => {
      this.emitter.removeListener(type, listener);
    };
  }
}

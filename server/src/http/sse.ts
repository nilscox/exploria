import type { OutgoingMessage } from 'node:http';

import type { Logger } from '../di';
import type { UiEvent, UiNotifier } from '../domain/ui-notifier';

export class SseUiNotifier<Event extends UiEvent = UiEvent> implements UiNotifier<Event> {
  private readonly logger: Logger;

  private streams = new Map<string, Set<ServerSentEvent<Event>>>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  add(sessionId: string, stream: ServerSentEvent<Event>) {
    if (!this.streams.has(sessionId)) {
      this.streams.set(sessionId, new Set());
    }

    this.streams.get(sessionId)?.add(stream);
  }

  remove(sessionId: string, stream: ServerSentEvent<Event>) {
    this.streams.get(sessionId)?.delete(stream);

    if (this.streams.get(sessionId)?.size === 0) {
      this.streams.delete(sessionId);
    }
  }

  notify(key: string, event: Event) {
    this.logger.log('[SSE]', key, event.type, event);
    this.streams.get(key)?.forEach((stream) => stream.send(event));
  }
}

export class ServerSentEvent<Event extends { type: string }> {
  private res: OutgoingMessage;

  constructor(res: OutgoingMessage) {
    this.res = res;

    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.flushHeaders();
  }

  send({ type, ...event }: Event) {
    this.res.write(`event: ${type}\n`);
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

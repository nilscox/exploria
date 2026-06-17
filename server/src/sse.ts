import type { OutgoingMessage } from 'node:http';

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

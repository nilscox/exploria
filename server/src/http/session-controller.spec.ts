import { asValue } from 'awilix';
import 'dotenv/config';
import { EventSource } from 'eventsource';
import express from 'express';
import assert from 'node:assert';
import type { Server } from 'node:http';
import { after, before, describe, it, mock } from 'node:test';
import { promisify } from 'node:util';

import { container, StubClock, StubGenerator } from '../di';

import type { SessionEvent } from '../domain/session';

void describe('SessionController', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let test: Test;

  before(async () => {
    generator = new StubGenerator();
    clock = new StubClock();

    generator.nextId = 'id';

    container.register({
      generator: asValue(generator),
      clock: asValue(clock),
      logger: asValue({ log: () => {} }),
      openAiClient: asValue(null),
    });

    test = new Test(container.resolve('sessionController').router);
    await test.before();
  });

  after(async () => {
    await test.after();
    await container.resolve('database').$client.end();
  });

  void it('posts a message', async () => {
    const sessionId = '';
    const stream = new EventSource(new URL(`/${sessionId}/stream`, test.baseUrl));
    const open = mock.fn();
    const messageAdded = mock.fn();

    try {
      stream.addEventListener('open', open);
      await waitFor(() => assert.strictEqual(open.mock.callCount(), 1));

      stream.addEventListener('MessageAdded', messageAdded);

      const res = await test.fetch(`/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '42;' }),
      });

      assert(res.status);

      await waitFor(() => assert.strictEqual(messageAdded.mock.callCount(), 1));

      const event: MessageEvent = messageAdded.mock.calls[0]?.arguments[0];
      const data: Extract<SessionEvent, { type: 'MessageAdded' }> = JSON.parse(event.data);

      assert.deepEqual(data, {
        sessionId,
        message: {
          id: 'id',
          date: clock.date.toISOString(),
          role: 'user',
          content: '42;',
        },
      });
    } finally {
      stream.close();
    }
  });

  void it('forwards UI events', async () => {
    const sessionId = '';
    const sse = new EventSource(new URL(`/${sessionId}/stream`, test.baseUrl));
    const open = mock.fn();
    const subjectChanged = mock.fn();

    try {
      sse.addEventListener('open', open);
      await waitFor(() => assert.strictEqual(open.mock.callCount(), 1));

      sse.addEventListener('SubjectChanged', subjectChanged);

      const repository = container.resolve('sessionRepository');
      const session = await repository.find(sessionId);

      session?.setSubject('subject');

      await waitFor(() => assert.strictEqual(subjectChanged.mock.callCount(), 1));

      const event: MessageEvent = subjectChanged.mock.calls[0]?.arguments[0];
      const data: Extract<SessionEvent, { type: 'SubjectChanged' }> = JSON.parse(event.data);

      assert.deepEqual(data, { sessionId, subject: 'subject' });
    } finally {
      sse.close();
    }
  });
});

class Test {
  private app = express();
  private server?: Server;

  constructor(router: express.Router) {
    this.app.use(express.json());
    this.app.use(router);
  }

  get port() {
    const address = this.server?.address() as { port: number } | undefined;
    return address?.port;
  }

  get baseUrl() {
    return `http://localhost:${this.port}`;
  }

  async before() {
    return new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(0, (err) => (err ? reject(err) : resolve()));
    });
  }

  async after() {
    if (this.server) {
      await promisify(this.server.close.bind(this.server))();
    }
  }

  fetch(endpoint: string, init?: RequestInit) {
    return fetch(new URL(endpoint, this.baseUrl), init);
  }
}

async function waitFor(callback: () => unknown, { interval = 50, timeout = 1000 } = {}): Promise<void> {
  const start = Date.now();
  let lastError: unknown;

  while (Date.now() - start < timeout) {
    try {
      await callback();
      return;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw lastError;
}

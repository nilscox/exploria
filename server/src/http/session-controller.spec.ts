import { asValue } from 'awilix';
import 'dotenv/config';
import { EventSource } from 'eventsource';
import assert from 'node:assert';
import { after, before, describe, it, mock } from 'node:test';

import { container } from '../di';
import { Session, type SessionEvent } from '../domain/session';
import { createTestDatabase, ExpressFetcher, waitFor, type TestDatabase } from '../test-utils';
import { defined } from '../utils';

import type { SessionRepository } from '../database/session-repository';

void describe('SessionController', () => {
  let db: TestDatabase;
  let app: ExpressFetcher;

  let repository: SessionRepository;

  before(async () => {
    db = await createTestDatabase();

    container.register({
      logger: asValue({ log: () => {} }),
      openAiClient: asValue(null),
      database: asValue(db),
    });

    repository = container.resolve('sessionRepository');

    app = new ExpressFetcher(container.resolve('sessionController').router);
    await app.before();
  });

  after(async () => {
    await app.after();
    await db.$client.close();
  });

  void it('posts a message', async () => {
    let session: Session = new Session(
      container.resolve('generator'),
      container.resolve('clock'),
      container.resolve('uiNotifier'),
    );

    await repository.insert(session);

    const res = await app.fetch(`/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '42;' }),
    });

    assert(res.ok);

    session = defined(await repository.find(session.id));

    assert(session.messages.length === 1);
    assert(session.messages[0]?.role, 'user');
    assert(session.messages[0]?.content, '42;');
  });

  void it('forwards UI events', async () => {
    let session: Session = new Session(
      container.resolve('generator'),
      container.resolve('clock'),
      container.resolve('uiNotifier'),
    );

    await repository.insert(session);

    const sse = new EventSource(new URL(`/${session.id}/stream`, app.baseUrl));
    const open = mock.fn();
    const subjectChanged = mock.fn();

    try {
      sse.addEventListener('open', open);
      await waitFor(() => assert.strictEqual(open.mock.callCount(), 1));

      sse.addEventListener('SubjectChanged', subjectChanged);

      const repository = container.resolve('sessionRepository');
      session = defined(await repository.find(session.id));

      session.setSubject('subject');

      await waitFor(() => assert.strictEqual(subjectChanged.mock.callCount(), 1));

      const event: MessageEvent = subjectChanged.mock.calls[0]?.arguments[0];
      const data: Extract<SessionEvent, { type: 'SubjectChanged' }> = JSON.parse(event.data);

      assert.deepEqual(data, { sessionId: session.id, subject: 'subject' });
    } finally {
      sse.close();
    }
  });
});

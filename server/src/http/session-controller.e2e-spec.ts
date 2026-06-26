import { asValue } from 'awilix';
import 'dotenv/config';
import { EventSource } from 'eventsource';
import assert from 'node:assert';
import { after, before, describe, it, mock } from 'node:test';

import { StubAiClient } from '../adapters/ai-client';
import { container } from '../di';
import { Session } from '../domain/session';
import { createTestDatabase, ExpressFetcher, waitFor, type TestDatabase } from '../test-utils';
import { defined } from '../utils';
import { SessionSseSubscriber } from './session-sse-subscriber';

import type { Config } from '../adapters/config';
import type { SessionRepository } from '../database/session-repository';
import type { Shared } from '../shared';

void describe('SessionController', () => {
  const config: Config = {
    server: { host: '', port: 0 },
    database: { url: '', debug: false },
    openAi: { baseUrl: '', apiKey: '' },
    assistant: undefined,
    searchApiKey: undefined,
  };

  let db: TestDatabase;
  let app: ExpressFetcher;
  let aiClient: StubAiClient;

  let repository: SessionRepository;

  before(async () => {
    db = await createTestDatabase();
    aiClient = new StubAiClient();

    container.register({
      config: asValue(config),
      logger: asValue({ log: () => {} }),
      aiClient: asValue(aiClient),
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
    let session = container.build(Session);

    await repository.insert(session);

    aiClient.results.push({
      content: '',
      toolCalls: [],
    });

    const res = await app.fetch(`/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '42;' }),
    });

    assert(res.ok, await res.text());

    session = defined(await repository.find(session.id));

    assert(session.events.length === 1);
    assert(session.events[0]?.type === 'MessageAdded');
    assert(session.events[0].message.role, 'user');
    assert(session.events[0].message.content, '42;');
  });

  void it('forwards UI events', async () => {
    new SessionSseSubscriber(
      container.resolve('events'),
      container.resolve('sessionRepository'),
      container.resolve('uiNotifier'),
    );

    const session = container.build(Session);
    await repository.insert(session);

    const sse = new EventSource(new URL(`/${session.id}/stream`, app.baseUrl));

    try {
      const open = mock.fn();

      sse.addEventListener('open', open);
      await waitFor(() => assert.strictEqual(open.mock.callCount(), 1));

      const timeline: Shared.TimelineItem[] = [];

      sse.addEventListener('TimelineItemAdded' satisfies Shared.SessionUiEvent['type'], ({ data }) => {
        const event: Extract<Shared.SessionUiEvent, { type: 'TimelineItemAdded' }> = JSON.parse(data);
        timeline.push(event.item);
      });

      aiClient.results.push({
        content: 'Answer.',
        toolCalls: [],
      });

      const res = await app.fetch(`/${session.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Question?' }),
      });

      assert(res.ok);

      await waitFor(() =>
        assert.deepStrictEqual(timeline, [
          { kind: 'message', role: 'user', content: 'Question?' },
          { kind: 'message', role: 'assistant', content: 'Answer.' },
        ] satisfies Shared.TimelineItem[]),
      );
    } finally {
      sse.close();
    }
  });
});

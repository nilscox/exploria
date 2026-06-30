import { asValue } from 'awilix';
import 'dotenv/config';
import { EventSource } from 'eventsource';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { StubAiClient } from '../adapters/ai-client';
import { StubClock } from '../adapters/clock';
import { StubGenerator } from '../adapters/generator';
import { container } from '../di';
import { Session } from '../domain/session';
import { ServerFetcher, createTestDatabase, waitFor, type TestDatabase } from '../test-utils';
import { defined } from '../utils';
import { SessionSseSubscriber } from './session-sse-subscriber';

import type { Config } from '../adapters/config';
import type { SessionRepository } from '../database/session-repository';
import type { UserRepository } from '../database/user-repository';
import type { Shared } from '../shared';

void describe('SessionController', () => {
  const config: Config = {
    env: 'test',
    server: { host: '', port: 0 },
    database: { url: '', debug: false },
    openAi: { baseUrl: '', apiKey: '' },
    auth: { cookieSecret: ServerFetcher.cookieSecret, clientUrl: '' },
    assistant: undefined,
    tavilyApiKey: undefined,
  };

  let clock: StubClock;
  let generator: StubGenerator;
  let db: TestDatabase;
  let app: ServerFetcher;
  let aiClient: StubAiClient;

  let repository: SessionRepository;
  let userRepository: UserRepository;

  beforeEach(async () => {
    clock = new StubClock();
    generator = new StubGenerator();
    db = await createTestDatabase();
    aiClient = new StubAiClient();

    container.register({
      config: asValue(config),
      clock: asValue(clock),
      logger: asValue({ log: () => {} }),
      aiClient: asValue(aiClient),
      database: asValue(db),
    });

    repository = container.resolve('sessionRepository');
    userRepository = container.resolve('userRepository');

    app = new ServerFetcher(userRepository, (app) => {
      app.use('/auth', container.resolve('authController').router);
      app.use('/session', container.resolve('sessionController').router);
    });

    await app.before();
  });

  afterEach(async () => {
    await app.after();
    await db.$testClient.close();
  });

  void it('posts a message', async () => {
    let session = container.build(Session);

    await repository.insert(session);

    aiClient.results.push({
      content: '',
      toolCalls: [],
    });

    const res = await app.fetch(`/session/${session.id}/message`, {
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

    const sse = new EventSource(new URL(`/session/${session.id}/stream`, app.baseUrl));

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

      const res = await app.fetch(`/session/${session.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Question?' }),
      });

      assert(res.ok);

      await waitFor(() =>
        assert.deepStrictEqual(timeline, [
          { kind: 'message', date: clock.date.toISOString(), role: 'user', content: 'Question?' },
          { kind: 'message', date: clock.date.toISOString(), role: 'assistant', content: 'Answer.' },
        ] satisfies Shared.TimelineItem[]),
      );
    } finally {
      sse.close();
    }
  });

  void it('creates and gets a session as authenticated user', async () => {
    await userRepository.create({ email: 'auth-session@test.dev', loginToken: 'token' });
    await app.login('token');

    let res = await app.fetch('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', subject: 'Test subject', language: 'en' }),
    });

    const sessionId = await res.text();

    assert(res.ok, sessionId);

    res = await app.fetch(`/session/${sessionId}`);
    const session = (await res.json()) as Shared.Session;

    assert(res.ok, JSON.stringify(session));
    assert.strictEqual(session.id, sessionId);
  });

  void describe('session ownership', () => {
    async function createUser() {
      return await userRepository.create({ email: 'user@test.dev', loginToken: 'token' });
    }

    async function createSession({ ownerId }: { ownerId: string | null }) {
      const session = Session.create(generator, clock, { model: 'model', language: 'en', ownerId });

      await repository.insert(session);
      await repository.save(session);

      return session;
    }

    void it('unauthenticated users only public sessions', async () => {
      const owner = await createUser();
      const publicSession = await createSession({ ownerId: null });
      const privateSession = await createSession({ ownerId: owner.id });

      const res = await app.fetch('/session');
      const sessions = (await res.json()) as Array<{ id: string }>;

      const ids = sessions.map((s) => s.id);

      assert(ids.includes(publicSession.id));
      assert(!ids.includes(privateSession.id));
    });

    void it('authenticated user sees only their own sessions', async () => {
      const owner = await createUser();
      await app.login('token');

      const ownSession = await createSession({ ownerId: owner.id });
      const otherSession = await createSession({ ownerId: null });

      const res = await app.fetch('/session');
      const sessions = (await res.json()) as Array<{ id: string }>;

      const ids = sessions.map((s) => s.id);

      assert(ids.includes(ownSession.id));
      assert(!ids.includes(otherSession.id));

      app.setCookie(null);
    });

    void it('returns 404 when accessing a private session from another user', async () => {
      const owner = await createUser();
      const session = await createSession({ ownerId: owner.id });

      const res = await app.fetch(`/session/${session.id}`);

      assert.strictEqual(res.status, 404);
    });

    void it('allows access to public sessions without authentication', async () => {
      const session = await createSession({ ownerId: null });

      const res = await app.fetch(`/session/${session.id}`);

      assert(res.ok);
    });
  });
});

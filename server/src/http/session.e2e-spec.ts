import 'dotenv/config';
import { EventSource } from 'eventsource';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { container } from '../di.ts';
import { Session } from '../domain/session.ts';
import { E2eTest, waitFor } from '../test-utils.ts';
import { defined } from '../utils.ts';
import { SessionSseSubscriber } from './session-sse-subscriber.ts';

import type { Shared } from '../shared.ts';

void describe('SessionController', () => {
  let test: E2eTest;

  beforeEach(async () => {
    test = await E2eTest.create((app) => {
      app.use('/auth', container.resolve('authController').router);
      app.use('/session', container.resolve('sessionController').router);
    });
  });

  afterEach(() => test.cleanup());

  void it('posts a message', async () => {
    let session = test.build(Session);

    await test.sessions.insert(session);

    test.aiClient.results.push({
      content: '',
      toolCalls: [],
    });

    const res = await test.fetch(`/session/${session.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '42;' }),
    });

    assert(res.ok, await res.text());

    session = defined(await test.sessions.find(session.id));

    assert(session.events.length === 1);
    assert(session.events[0]?.type === 'MessageAdded');
    assert(session.events[0].message.role, 'user');
    assert(session.events[0].message.content, '42;');
  });

  void it('forwards UI events', async () => {
    const subscriber = test.build(SessionSseSubscriber);

    const session = test.build(Session);
    await test.sessions.insert(session);

    const sse = new EventSource(new URL(`/session/${session.id}/stream`, test.fetcher.baseUrl));

    try {
      const open = mock.fn();

      sse.addEventListener('open', open);
      await waitFor(() => assert.strictEqual(open.mock.callCount(), 1));

      const timeline: Shared.TimelineItem[] = [];

      sse.addEventListener('TimelineItemAdded' satisfies Shared.SessionUiEvent['type'], ({ data }) => {
        const event: Extract<Shared.SessionUiEvent, { type: 'TimelineItemAdded' }> = JSON.parse(data);
        timeline.push(event.item);
      });

      test.aiClient.results.push({
        content: 'Answer.',
        toolCalls: [],
      });

      const res = await test.fetch(`/session/${session.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Question?' }),
      });

      assert(res.ok);

      await waitFor(() =>
        assert.deepStrictEqual(timeline, [
          { kind: 'message', date: test.clock.date.toISOString(), role: 'user', content: 'Question?' },
          { kind: 'message', date: test.clock.date.toISOString(), role: 'assistant', content: 'Answer.' },
        ] satisfies Shared.TimelineItem[]),
      );
    } finally {
      sse.close();
      subscriber.unsubscribe();
    }
  });

  void it('creates and gets a session as authenticated user', async () => {
    await test.users.create({ email: 'auth-session@test.dev', loginToken: 'token' });
    await test.login('token');

    let res = await test.fetch('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', subject: 'Test subject', language: 'en' }),
    });

    const sessionId = await res.text();

    assert(res.ok, sessionId);

    res = await test.fetch(`/session/${sessionId}`);
    const session = (await res.json()) as Shared.Session;

    assert(res.ok, JSON.stringify(session));
    assert.strictEqual(session.id, sessionId);
  });

  void describe('session ownership', () => {
    async function createUser() {
      return await test.users.create({ email: 'user@test.dev', loginToken: 'token' });
    }

    async function createSession({ ownerId }: { ownerId: string | null }) {
      const session = Session.create(test.generator, test.clock, { model: 'model', language: 'en', ownerId });

      await test.sessions.insert(session);
      await test.sessions.save(session);

      return session;
    }

    void it('unauthenticated users only public sessions', async () => {
      const owner = await createUser();
      const publicSession = await createSession({ ownerId: null });
      const privateSession = await createSession({ ownerId: owner.id });

      const res = await test.fetch('/session');
      const sessions = (await res.json()) as Array<{ id: string }>;

      const ids = sessions.map((s) => s.id);

      assert(ids.includes(publicSession.id));
      assert(!ids.includes(privateSession.id));
    });

    void it('authenticated user sees only their own sessions', async () => {
      const owner = await createUser();
      await test.login('token');

      const ownSession = await createSession({ ownerId: owner.id });
      const otherSession = await createSession({ ownerId: null });

      const res = await test.fetch('/session');
      const sessions = (await res.json()) as Array<{ id: string }>;

      const ids = sessions.map((s) => s.id);

      assert(ids.includes(ownSession.id));
      assert(!ids.includes(otherSession.id));
    });

    void it('returns 404 when accessing a private session from another user', async () => {
      const owner = await createUser();
      const session = await createSession({ ownerId: owner.id });

      const res = await test.fetch(`/session/${session.id}`);

      assert.strictEqual(res.status, 404);
    });

    void it('allows access to public sessions without authentication', async () => {
      const session = await createSession({ ownerId: null });

      const res = await test.fetch(`/session/${session.id}`);

      assert(res.ok);
    });
  });

  void describe('mind map', () => {
    async function createSession() {
      const session = Session.create(test.generator, test.clock, { model: 'model', language: 'en', ownerId: null });

      await test.sessions.insert(session);
      await test.sessions.save(session);

      return session.id;
    }

    async function view(id: string) {
      const res = await test.fetch(`/session/${id}`);

      assert(res.ok, `GET /session/${id} failed with status ${res.status}`);

      return (await res.json()) as Shared.Session;
    }

    async function send(id: string, path: string, method: string, body: object) {
      const res = await test.fetch(`/session/${id}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      assert(res.ok, await res.text());
    }

    void it('adds a node exposed as a top-level topic', async () => {
      const id = await createSession();

      await send(id, '/topic', 'POST', { label: 'Node A' });

      const session = await view(id);

      assert.partialDeepStrictEqual(session.topics, [{ parentId: null, label: 'Node A', status: 'pending' }]);
      assert.partialDeepStrictEqual(session.topics, [{ label: 'Node A', status: 'pending' }]);
    });

    void it('nests a node and attaches a note to it', async () => {
      const id = await createSession();

      await send(id, '/topic', 'POST', { label: 'Parent' });
      const parentId = (await view(id)).topics[0]!.id;

      await send(id, '/topic', 'POST', { label: 'Child', parentId });
      await send(id, '/note', 'POST', { title: 'Note', content: 'A note', topicId: parentId });

      const session = await view(id);

      assert.strictEqual(session.topics.length, 2);
      assert.strictEqual(session.topics.filter((topic) => topic.parentId === null).length, 1);
      assert.partialDeepStrictEqual(session.notes, [{ title: 'Note', content: 'A note', parentId }]);
    });

    void it('updates a top-level node, then clears its status when nested via move', async () => {
      const id = await createSession();

      await send(id, '/topic', 'POST', { label: 'Node' });
      const nodeId = (await view(id)).topics[0]!.id;

      await send(id, '/topic', 'POST', { label: 'Parent' });
      const parentId = (await view(id)).topics[1]!.id;

      await send(id, `/topic/${nodeId}`, 'PUT', { label: 'Renamed', status: 'in_progress' });

      assert.partialDeepStrictEqual(
        (await view(id)).topics.find((node) => node.id === nodeId),
        { label: 'Renamed', status: 'in_progress', parentId: null },
      );

      await send(id, `/topic/${nodeId}/move`, 'PUT', { parentId });

      const node = (await view(id)).topics.find((node) => node.id === nodeId);

      assert.deepStrictEqual(node, { id: nodeId, label: 'Renamed', parentId });
    });

    void it('sets a topic summary', async () => {
      const id = await createSession();

      await send(id, '/topic', 'POST', { label: 'Topic' });
      const nodeId = (await view(id)).topics[0]!.id;

      await send(id, `/topic/${nodeId}`, 'PUT', { summary: 'A recap of the discussion.' });

      const node = (await view(id)).topics.find((node) => node.id === nodeId);

      assert.partialDeepStrictEqual(node, { summary: 'A recap of the discussion.' });
    });

    void it('removes a node with its descendants and their notes', async () => {
      const id = await createSession();

      await send(id, '/topic', 'POST', { label: 'Parent' });
      const parentId = (await view(id)).topics[0]!.id;

      await send(id, '/topic', 'POST', { label: 'Child', parentId });
      await send(id, '/note', 'POST', { title: 'Note', content: 'A note', topicId: parentId });

      await send(id, `/topic/${parentId}`, 'DELETE', {});

      const session = await view(id);

      assert.deepStrictEqual(session.topics, []);
      assert.deepStrictEqual(session.notes, []);
    });
  });
});

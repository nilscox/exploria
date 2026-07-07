import { asValue } from 'awilix';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubAiClient } from '../adapters/ai-client.ts';
import { StubClock } from '../adapters/clock.ts';
import { StubGenerator } from '../adapters/generator.ts';
import { MustacheI18n } from '../adapters/i18n.ts';
import { StubUiNotifier } from '../adapters/logger.ts';
import { StubSearchClient } from '../adapters/search-client.ts';
import { container } from '../di.ts';
import { Session, type GetSessionEvent, type SessionEvent } from './session.ts';

import type { DomainEvent } from '../aggregate-root.ts';

void describe('Assistant', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let uiNotifier: StubUiNotifier;
  let aiClient: StubAiClient;

  beforeEach(() => {
    generator = new StubGenerator();
    clock = new StubClock();
    uiNotifier = new StubUiNotifier();
    aiClient = new StubAiClient();

    container.register({
      generator: asValue(generator),
      clock: asValue(clock),
      uiNotifier: asValue(uiNotifier),
      aiClient: asValue(aiClient),
    });
  });

  function createSessionEvent<Type extends SessionEvent['type']>(
    sessionId: string,
    type: Type,
    payload: Omit<GetSessionEvent<Type>, keyof DomainEvent>,
  ) {
    return {
      type,
      aggregateType: 'Session',
      aggregateId: sessionId,
      occurredAt: clock.date,
      ...payload,
    } as SessionEvent;
  }

  void it('handles a message', async () => {
    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push({
      content: 'Hi (:',
      toolCalls: [],
    });

    await assistant.run(session, 'Hello!');

    const events = session.peekDomainEvents();

    assert.deepStrictEqual(events, [
      createSessionEvent(session.id, 'MessageAdded', {
        message: {
          date: clock.date.toISOString(),
          content: 'Hello!',
          role: 'user',
        },
      }),
      createSessionEvent(session.id, 'MessageAdded', {
        message: {
          date: clock.date.toISOString(),
          content: 'Hi (:',
          role: 'assistant',
          model: '',
        },
      }),
    ]);
  });

  void it('handles tool calls', async () => {
    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push({
      content: 'Call this tool',
      toolCalls: [{ id: 'id', name: 'setPosture', arguments: { posture: 'advisor', reason: 'why not' } }],
    });

    await assistant.run(session);

    const events = session.peekDomainEvents();

    assert.deepStrictEqual(events, [
      createSessionEvent(session.id, 'MessageAdded', {
        message: {
          date: clock.date.toISOString(),
          role: 'assistant',
          content: 'Call this tool',
          model: '',
        },
      }),
      createSessionEvent(session.id, 'PostureChanged', {
        posture: 'advisor',
        reason: 'why not',
        forced: false,
      }),
      createSessionEvent(session.id, 'ToolCalled', {
        toolCall: { id: 'id', name: 'setPosture', arguments: { posture: 'advisor', reason: 'why not' } },
        actor: 'facilitator',
        result: 'OK',
      }),
    ]);
  });

  void it('handles failing tool calls', async () => {
    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push({
      content: 'Call this tool',
      toolCalls: [{ id: 'id', name: 'setPosture', arguments: { posture: 'advisor', reason: '' } }],
    });

    await assistant.run(session);

    const events = session.peekDomainEvents();
    const event = events.at(-1) as GetSessionEvent<'ToolCalled'>;

    assert.partialDeepStrictEqual(event, {
      type: 'ToolCalled',
      actor: 'facilitator',
      error: 'Too small: expected string to have >=1 characters',
    });
  });

  void it('does not regenerate a reply after a terminal tool call', async () => {
    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push({
      content: 'What do you think?',
      toolCalls: [{ id: 'id', name: 'setPosture', arguments: { posture: 'advisor', reason: 'why not' } }],
    });

    await assistant.run(session);

    const messages = session.events.filter((event) => event.type === 'MessageAdded');

    assert.strictEqual(aiClient.results.length, 0);
    assert.strictEqual(messages.length, 1);
  });

  void it('regenerates a reply when a terminal tool call comes without content', async () => {
    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push(
      {
        content: '',
        toolCalls: [{ id: 'id', name: 'setPosture', arguments: { posture: 'advisor', reason: 'why not' } }],
      },
      {
        content: 'What do you think?',
        toolCalls: [],
      },
    );

    await assistant.run(session);

    const messages = session.events.filter((event) => event.type === 'MessageAdded');

    assert.strictEqual(aiClient.results.length, 0);
    assert.deepStrictEqual(
      messages.map(({ message }) => message.content),
      ['What do you think?'],
    );
  });

  void it('regenerates a reply after a web search', async () => {
    const searchClient = new StubSearchClient();

    container.register({ searchClient: asValue(searchClient) });

    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    searchClient.results = [{ title: 'Node', url: 'https://nodejs.org', snippet: 'A runtime.' }];

    aiClient.results.push(
      {
        content: '',
        toolCalls: [{ id: 'id', name: 'webSearch', arguments: { query: 'node' } }],
      },
      {
        content: 'Node is a runtime.',
        toolCalls: [],
      },
    );

    await assistant.run(session);

    const lastMessage = session.events.findLast((event) => event.type === 'MessageAdded');

    assert.strictEqual(aiClient.results.length, 0);
    assert.strictEqual(lastMessage?.message.content, 'Node is a runtime.');
  });

  void it('runs the curator after the reply', async () => {
    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push(
      {
        content: 'Hi (:',
        toolCalls: [],
      },
      {
        content: '',
        toolCalls: [{ id: 'id', name: 'addTopics', arguments: { labels: ['Node'] } }],
      },
    );

    await assistant.run(session, 'Hello!');

    const types = session.peekDomainEvents().map((event) => event.type);

    assert.deepStrictEqual(types, ['MessageAdded', 'MessageAdded', 'TopicAdded', 'ToolCalled']);
  });

  void it('does not propagate curator failures', async () => {
    container.register({ logger: asValue({ log() {}, error() {} }) });

    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push({
      content: 'Hi (:',
      toolCalls: [],
    });

    aiClient.createCompletion = async () => {
      throw new Error('boom');
    };

    await assistant.run(session, 'Hello!');

    const types = session.peekDomainEvents().map((event) => event.type);

    assert.deepStrictEqual(types, ['MessageAdded', 'MessageAdded']);
  });

  void it('renders session info with timer', () => {
    const i18n = new MustacheI18n(clock);
    const session = new Session(generator, clock);

    session.startTimer(60);
    clock.advance({ minutes: 5 });

    let result = i18n.render('en', 'session-info', { session });

    assert(result.includes('Session time: 60 minutes'));
    assert(result.includes('Elapsed time: 5 minutes'));
    assert(result.includes('Remaining time: 55 minutes'));

    session.pauseTimer();

    result = i18n.render('en', 'session-info', { session });

    assert(result.includes('Timer paused'));

    session.resumeTimer();
    clock.advance({ minutes: 60 });

    result = i18n.render('en', 'session-info', { session });

    assert(result.includes('Session time: 60 minutes'));
    assert(result.includes('Elapsed time: 65 minutes'));
    assert(result.includes('Remaining time: 0 minutes'));
    assert(result.includes('Time is up, it is necessary to conclude'));
  });
});

import { asValue } from 'awilix';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubAiClient } from '../adapters/ai-client';
import { StubClock } from '../adapters/clock';
import { StubGenerator } from '../adapters/generator';
import { MustacheI18n } from '../adapters/i18n';
import { StubUiNotifier } from '../adapters/logger';
import { container } from '../di';
import { Session, type GetSessionEvent, type SessionEvent } from './session';

import type { DomainEvent } from '../aggregate-root';

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
          date: clock.date,
          content: 'Hello!',
          role: 'user',
        },
      }),
      createSessionEvent(session.id, 'MessageAdded', {
        message: {
          date: clock.date,
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

    aiClient.results.push(
      {
        content: 'Call this tool',
        toolCalls: [{ id: 'id', name: 'startTimer', arguments: { duration: 42 } }],
      },
      {
        content: '',
        toolCalls: [],
      },
    );

    await assistant.run(session);

    const events = session.peekDomainEvents();

    assert.deepStrictEqual(events, [
      createSessionEvent(session.id, 'MessageAdded', {
        message: {
          date: clock.date,
          role: 'assistant',
          content: 'Call this tool',
          model: '',
          toolCalls: [{ id: 'id', name: 'startTimer', arguments: { duration: 42 } }],
        },
      }),
      createSessionEvent(session.id, 'TimerStarted', {
        duration: 42,
      }),
      createSessionEvent(session.id, 'ToolCallResultAdded', {
        result: {
          id: 'id',
          date: clock.date,
          error: null,
          result: 'OK',
        },
      }),
    ]);
  });

  void it('handles failing tool calls', async () => {
    const session = container.build(Session);
    const assistant = container.resolve('assistant');

    aiClient.results.push(
      {
        content: 'Call this tool',
        toolCalls: [{ id: 'id', name: 'startTimer', arguments: { duration: -42 } }],
      },
      {
        content: '',
        toolCalls: [],
      },
    );

    await assistant.run(session);

    const events = session.peekDomainEvents();
    const event = events.at(-1) as GetSessionEvent<'ToolCallResultAdded'>;

    assert.partialDeepStrictEqual(event, {
      type: 'ToolCallResultAdded',
      result: {
        result: null,
        error: 'Too small: expected number to be >=1',
      },
    });
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

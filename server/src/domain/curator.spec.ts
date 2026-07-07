import { asValue } from 'awilix';
import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubAiClient } from '../adapters/ai-client.ts';
import { StubClock } from '../adapters/clock.ts';
import { StubGenerator } from '../adapters/generator.ts';
import { container } from '../di.ts';
import { Session, type GetSessionEvent } from './session.ts';

void describe('Curator', () => {
  let clock: StubClock;
  let aiClient: StubAiClient;

  beforeEach(() => {
    clock = new StubClock();
    aiClient = new StubAiClient();

    container.register({
      generator: asValue(new StubGenerator()),
      clock: asValue(clock),
      aiClient: asValue(aiClient),
    });
  });

  void it('executes tool calls and records them', async () => {
    const session = container.build(Session);
    const curator = container.resolve('curator');

    aiClient.results.push({
      content: '',
      toolCalls: [{ id: 'id', name: 'addTopics', arguments: { labels: ['Node'] } }],
    });

    await curator.run(session);

    const events = session.peekDomainEvents();
    const types = events.map((event) => event.type);

    assert.deepStrictEqual(types, ['TopicAdded', 'ToolCalled']);

    const toolCalled = events.at(-1) as GetSessionEvent<'ToolCalled'>;

    assert.partialDeepStrictEqual(toolCalled, {
      toolCall: { id: 'id', name: 'addTopics' },
      actor: 'curator',
      result: 'OK',
    });
  });

  void it('records failing tool calls', async () => {
    const session = container.build(Session);
    const curator = container.resolve('curator');

    aiClient.results.push({
      content: '',
      toolCalls: [{ id: 'id', name: 'updateTopic', arguments: { id: 'unknown', label: 'Node' } }],
    });

    await curator.run(session);

    const toolCalled = session.peekDomainEvents().at(-1) as GetSessionEvent<'ToolCalled'>;

    assert.partialDeepStrictEqual(toolCalled, {
      type: 'ToolCalled',
      actor: 'curator',
      error: 'Cannot find topic "unknown"',
    });
  });

  void it('feeds tool results back until there is nothing left to do', async () => {
    const session = container.build(Session);
    const curator = container.resolve('curator');

    aiClient.results.push(
      {
        content: '',
        toolCalls: [{ id: 'id-1', name: 'setSubject', arguments: { subject: 'Node' } }],
      },
      {
        content: '',
        toolCalls: [{ id: 'id-2', name: 'addTopics', arguments: { labels: ['Runtime'] } }],
      },
      {
        content: '',
        toolCalls: [],
      },
    );

    await curator.run(session);

    const types = session.peekDomainEvents().map((event) => event.type);

    assert.deepStrictEqual(types, ['SubjectChanged', 'ToolCalled', 'TopicAdded', 'ToolCalled']);
    assert.strictEqual(aiClient.results.length, 0);
  });

  void it('stops after a bounded number of iterations', async () => {
    const session = container.build(Session);
    const curator = container.resolve('curator');

    for (let i = 0; i < 5; i++) {
      aiClient.results.push({
        content: '',
        toolCalls: [{ id: `id-${i}`, name: 'setSubject', arguments: { subject: `Subject ${i}` } }],
      });
    }

    await curator.run(session);

    assert.strictEqual(aiClient.results.length, 2);
  });
});

import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubAiClient } from '../adapters/ai-client.ts';
import { StubClock } from '../adapters/clock.ts';
import { StubGenerator } from '../adapters/generator.ts';
import { MustacheI18n, type I18n } from '../adapters/i18n.ts';
import { createCuratorTools, type CuratorTools } from './assistant-tools.ts';
import { Curator } from './curator.ts';
import { Session, type GetSessionEvent } from './session.ts';

void describe('Curator', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let aiClient: StubAiClient;
  let i18n: I18n;
  let curatorTools: CuratorTools;

  beforeEach(() => {
    generator = new StubGenerator();
    clock = new StubClock();
    aiClient = new StubAiClient();
    i18n = new MustacheI18n({ clock });
    curatorTools = createCuratorTools({ i18n });
  });

  void it('executes tool calls and records them', async () => {
    const session = new Session(generator, clock);
    const curator = new Curator({ aiClient, i18n, curatorTools });

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
    const session = new Session(generator, clock);
    const curator = new Curator({ aiClient, i18n, curatorTools });

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
    const session = new Session(generator, clock);
    const curator = new Curator({ aiClient, i18n, curatorTools });

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
    const session = new Session(generator, clock);
    const curator = new Curator({ aiClient, i18n, curatorTools });

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

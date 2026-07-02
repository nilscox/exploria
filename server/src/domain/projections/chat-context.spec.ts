import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../../adapters/clock.ts';
import { StubGenerator } from '../../adapters/generator.ts';
import { MustacheI18n } from '../../adapters/i18n.ts';
import { type Translate } from '../i18n/index.ts';
import { Session } from '../session.ts';
import { toChatMessages } from './chat-context.ts';

import type { AiClientMessage } from '../../adapters/ai-client.ts';

void describe('toChatMessages', () => {
  let t: Translate;
  let session: Session;

  beforeEach(() => {
    t = new MustacheI18n(new StubClock()).translate('en');
    session = new Session(new StubGenerator(), new StubClock());
  });

  void it('projects message and tool-call events to chat messages', () => {
    session.addMessage('user', 'Hello');
    session.addMessage('assistant', 'Calling a tool', {
      model: 'gpt-4o',
      toolCalls: [{ id: 'call-1', name: 'startTimer', arguments: { duration: 42 } }],
    });
    session.addToolCallResult('call-1', { result: 'Timer started' });

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), [
      { role: 'user', content: 'Hello' },
      {
        role: 'assistant',
        content: 'Calling a tool',
        toolCalls: [{ id: 'call-1', name: 'startTimer', arguments: { duration: 42 } }],
      },
      { role: 'tool', toolCallId: 'call-1', content: 'Timer started' },
    ] satisfies AiClientMessage[]);
  });

  void it('wraps tool-call errors in an error object', () => {
    session.addMessage('assistant', '', {
      model: 'gpt-4o',
      toolCalls: [{ id: 'call-1', name: 'startTimer', arguments: '{}' }],
    });
    session.addToolCallResult('call-1', { error: 'boom' });

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t).at(-1), {
      role: 'tool',
      toolCallId: 'call-1',
      content: { error: 'boom' },
    } satisfies AiClientMessage);
  });

  void it('ignores events that are not messages or tool-call results', () => {
    session.addNode({ label: 'Node' });
    session.startTimer(60);

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), []);
  });

  void it('projects discussionPathSelected to system messages', () => {
    session.setDiscussionPaths([{ label: 'Path A' }, { label: 'Path B' }]);
    const { id: pathId } = session.discussionPaths[0]!;

    session.selectDiscussionPath(pathId);

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t).at(-1), {
      role: 'system',
      content: 'Selected discussion path: "Path A"',
    } satisfies AiClientMessage);
  });
});

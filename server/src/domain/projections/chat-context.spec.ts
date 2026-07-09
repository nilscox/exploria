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
  let clock: StubClock;
  let t: Translate;
  let session: Session;

  beforeEach(() => {
    clock = new StubClock();
    t = new MustacheI18n({ clock }).translate('en');
    session = new Session(new StubGenerator(), clock);
  });

  void it('projects messages to chat messages', () => {
    session.addMessage('user', 'Hello');
    session.addMessage('assistant', 'Hi!', { model: 'gpt-4o' });

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
    ] satisfies AiClientMessage[]);
  });

  void it('omits assistant messages with an empty content', () => {
    session.addMessage('assistant', '', { model: 'gpt-4o' });

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), []);
  });

  void it('omits curator tool calls', () => {
    session.recordToolCall({ id: 'call-1', name: 'setSubject', arguments: { subject: 'Node' } }, 'curator', {
      result: 'OK',
    });

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), []);
  });

  void it('keeps facilitator tool calls', () => {
    session.recordToolCall(
      { id: 'call-1', name: 'saveNote', arguments: { title: 'My note', content: 'Something' } },
      'facilitator',
      { result: 'OK' },
    );

    session.recordToolCall(
      { id: 'call-2', name: 'setPosture', arguments: { posture: 'What', reason: '' } },
      'facilitator',
      { error: 'Invalid posture' },
    );

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), [
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call-1', name: 'saveNote', arguments: '{"title":"My note","content":"Something"}' }],
      },
      {
        role: 'tool',
        toolCallId: 'call-1',
        content: 'OK',
      },
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call-2', name: 'setPosture', arguments: '{"posture":"What","reason":""}' }],
      },
      {
        role: 'tool',
        toolCallId: 'call-2',
        content: 'Error: Invalid posture',
      },
    ] satisfies AiClientMessage[]);
  });

  void it('converts web searches to system messages', () => {
    session.recordToolCall({ id: 'call-1', name: 'webSearch', arguments: { query: 'node' } }, 'facilitator', {
      result: '**Node**\nA runtime.',
    });

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), [
      { role: 'system', content: 'Web search results for "node":\n\n**Node**\nA runtime.' },
    ] satisfies AiClientMessage[]);
  });

  void it('converts failed web searches to system messages', () => {
    session.recordToolCall({ id: 'call-1', name: 'webSearch', arguments: { query: 'node' } }, 'facilitator', {
      error: 'boom',
    });

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), [
      { role: 'system', content: 'Web search for "node" failed: boom' },
    ] satisfies AiClientMessage[]);
  });

  void it('ignores events that are not messages or tool calls', () => {
    session.addTopic({ label: 'Node' });
    session.startTimer(60);

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t), []);
  });

  void it('projects answerSelected to system messages', () => {
    session.askQuestions([
      {
        content: 'Which one?',
        options: [
          { label: 'Option A', description: 'a' },
          { label: 'Option B', description: 'b' },
        ],
      },
    ]);

    const question = session.questions[0]!;
    const option = question.options[0]!;

    session.selectAnswer(question.id, option.id);

    assert.deepStrictEqual(toChatMessages(session.peekDomainEvents(), t).at(-1), {
      role: 'system',
      content: 'Answered "Which one?" with: "Option A"',
    } satisfies AiClientMessage);
  });
});

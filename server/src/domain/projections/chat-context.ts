import type { AiClientMessage } from '../../adapters/ai-client.ts';
import type { Translate } from '../i18n/index.ts';
import type { GetSessionEvent, SessionEvent } from '../session.ts';

export function toChatMessages(events: SessionEvent[], t: Translate): AiClientMessage[] {
  return events
    .filter(
      (event) =>
        event.type === 'MessageAdded' || event.type === 'ToolCallResultAdded' || event.type === 'AnswerSelected',
    )
    .map((event) => toChatMessage(event, t));
}

function toChatMessage(
  event: GetSessionEvent<'MessageAdded' | 'ToolCallResultAdded' | 'AnswerSelected'>,
  t: Translate,
): AiClientMessage {
  if (event.type === 'ToolCallResultAdded') {
    const { result } = event;

    return {
      role: 'tool',
      toolCallId: result.id,
      content: result.error ? { error: result.error } : result.result,
    };
  }

  if (event.type === 'AnswerSelected') {
    return {
      role: 'system',
      content: t('chat.answer-selected', { question: event.content, label: event.label }),
    };
  }

  const { message } = event;
  const { role, content } = message;

  const result: AiClientMessage = {
    role,
    content,
  };

  if (result.role === 'assistant' && message.role === 'assistant' && message.toolCalls) {
    result.toolCalls = message.toolCalls;
  }

  return result;
}

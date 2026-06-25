import type { AiClientMessage } from '../../adapters/ai-client';
import type { Translate } from '../i18n';
import type { GetSessionEvent, SessionEvent } from '../session';

export function toChatMessages(events: SessionEvent[], t: Translate): AiClientMessage[] {
  return events
    .filter(
      (event) =>
        event.type === 'MessageAdded' ||
        event.type === 'ToolCallResultAdded' ||
        event.type === 'DiscussionPathSelected',
    )
    .map((event) => toChatMessage(event, t));
}

function toChatMessage(
  event: GetSessionEvent<'MessageAdded' | 'ToolCallResultAdded' | 'DiscussionPathSelected'>,
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

  if (event.type === 'DiscussionPathSelected') {
    return {
      role: 'system',
      content: t('chat.discussion-path-selected', { label: event.label }),
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

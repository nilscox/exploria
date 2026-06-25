import type { AiClientMessage } from '../../adapters/ai-client';
import type { GetSessionEvent, SessionEvent } from '../session';

export function toChatMessages(events: SessionEvent[]): AiClientMessage[] {
  return events
    .filter(
      (event) =>
        event.type === 'MessageAdded' ||
        event.type === 'ToolCallResultAdded' ||
        event.type === 'DiscussionPathSelected',
    )
    .map(toChatMessage);
}

function toChatMessage(
  event: GetSessionEvent<'MessageAdded' | 'ToolCallResultAdded' | 'DiscussionPathSelected'>,
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
      content: `Chemin de discussion sélectionné: "${event.label}"`,
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

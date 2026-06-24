import type { AiClientMessage } from '../../adapters/ai-client';
import type { SessionEvent } from '../session';

export function toChatMessages(events: SessionEvent[]): AiClientMessage[] {
  return events
    .filter((event) => event.type === 'MessageAdded' || event.type === 'ToolCallResultAdded')
    .map((event) => {
      if (event.type === 'ToolCallResultAdded') {
        const { result } = event;

        return {
          role: 'tool',
          toolCallId: result.id,
          content: result.error ? { error: result.error } : result.result,
        };
      }

      const { message } = event;

      return {
        role: message.role,
        content: message.content,
        toolCalls: message.role === 'assistant' ? message.toolCalls : undefined,
      };
    });
}

import z from 'zod';

import type { AiClientMessage } from '../../adapters/ai-client.ts';
import type { Translate } from '../i18n/index.ts';
import type { SessionEvent, ToolCall } from '../session.ts';

export function toChatMessages(events: SessionEvent[], t: Translate): AiClientMessage[] {
  const messages: AiClientMessage[] = [];

  for (const event of events) {
    if (event.type === 'MessageAdded') {
      const { message } = event;

      if (message.content !== '') {
        messages.push({ role: message.role, content: message.content });
      }
    }

    if (event.type === 'ToolCalled') {
      appendWebSearch(messages, t, event.toolCall, event.result);
    }

    if (event.type === 'AnswerSelected') {
      messages.push({
        role: 'system',
        content: t('chat.answer-selected', { question: event.content, label: event.label }),
      });
    }
  }

  return messages;
}

const webSearchArguments = z.object({ query: z.string() });

function appendWebSearch(messages: AiClientMessage[], t: Translate, toolCall: ToolCall, result: unknown) {
  if (toolCall.name !== 'webSearch' || typeof result !== 'string') {
    return;
  }

  const { query } = webSearchArguments.parse(toolCall.arguments);

  messages.push({ role: 'system', content: t('chat.web-search', { query, results: result }) });
}

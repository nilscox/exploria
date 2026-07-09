import z from 'zod';

import { assert } from '../../utils.ts';

import type { AiClientMessage } from '../../adapters/ai-client.ts';
import type { Translate } from '../i18n/index.ts';
import type { GetSessionEvent, SessionEvent } from '../session.ts';

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
      messages.push(...toolCalls(t, event));
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

function toolCalls(t: Translate, event: GetSessionEvent<'ToolCalled'>): AiClientMessage[] {
  if (event.actor === 'curator') {
    return [];
  }

  if (event.toolCall.name === 'webSearch') {
    const { query } = webSearchArguments.parse(event.toolCall.arguments);

    if (event.error !== undefined) {
      return [{ role: 'system', content: t('chat.web-search-error', { query, error: event.error }) }];
    } else if (event.result !== undefined) {
      assert(typeof event.result === 'string');
      return [{ role: 'system', content: t('chat.web-search', { query, results: event.result }) }];
    }
  }

  return [
    {
      role: 'system',
      content: t('chat.tool-called', {
        name: event.toolCall.name,
        arguments: JSON.stringify(event.toolCall.arguments),
        error: event.error,
      }),
    },
  ];
}

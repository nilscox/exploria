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
      appendWebSearch(messages, t, event);
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

function appendWebSearch(messages: AiClientMessage[], t: Translate, event: GetSessionEvent<'ToolCalled'>) {
  if (event.toolCall.name !== 'webSearch') {
    return;
  }

  const { query } = webSearchArguments.parse(event.toolCall.arguments);

  if (event.error !== undefined) {
    messages.push({ role: 'system', content: t('chat.web-search-error', { query, error: event.error }) });
  } else if (event.result !== undefined) {
    assert(typeof event.result === 'string');
    messages.push({ role: 'system', content: t('chat.web-search', { query, results: event.result }) });
  }
}

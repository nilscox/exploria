import { intervalToDuration } from 'date-fns';
import z from 'zod';

import { assert, hasKey } from '../utils';
import { createTranslate } from './i18n';
import { toChatMessages } from './projections/chat-context';
import { tools } from './tools';

import type { AiClient } from '../adapters/ai-client';
import type { Clock } from '../adapters/clock';
import type { Translate } from './i18n';
import type { Session, ToolCall, TopicStatus } from './session';
import type { Tool } from './tools/create-tool';
import type { UiEvent, UiNotifier } from './ui-notifier';

export type AssistantUiEvent = UiEvent<'Chunk', { text: string }>;

export class Assistant {
  private readonly clock: Clock;
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly aiClient: AiClient;

  constructor(clock: Clock, uiNotifier: UiNotifier, aiClient: AiClient) {
    this.clock = clock;
    this.uiNotifier = uiNotifier;
    this.aiClient = aiClient;
  }

  async run(session: Session, message?: string, commit: () => Promise<void> = async () => {}) {
    if (message) {
      session.addMessage('user', message);
      await commit();
    }

    const t = createTranslate(session.language);

    const { content, toolCalls } = await this.aiClient.createCompletionStreaming({
      model: session.model,
      tools: tools[session.language],
      messages: [
        ...toChatMessages(session.events, t),
        {
          role: 'system',
          content: Assistant.formatSessionInfo(this.clock, session, t),
        },
      ],
      onChunk: (text) => this.uiNotifier.notify(session.id, { type: 'Chunk', text }),
    });

    if (content === '' && toolCalls.length === 0) {
      return;
    }

    session.addMessage('assistant', content, {
      model: session.model,
      toolCalls,
    });

    for (const toolCall of toolCalls) {
      await this.handleToolCall(session, toolCall);
    }

    await commit();

    if (toolCalls.length > 0) {
      await this.run(session, undefined, commit);
    }
  }

  async generateDemo(session: Session, commit: () => Promise<void> = async () => {}) {
    const t = createTranslate(session.language);

    for (let i = 0; i <= 3; ++i) {
      const { content } = await this.aiClient.createCompletion({
        model: session.model,
        messages: [
          {
            role: 'system',
            content: [
              t('demo.role-1'),
              t('demo.role-2'),
              ...(i === 0
                ? [t('demo.invent-subject')]
                : [
                    t('demo.conversation-start'),
                    ...session.events
                      .filter((event) => event.type === 'MessageAdded')
                      .filter(({ message }) => message.content !== '')
                      .filter(({ message }) => ['user', 'assistant'].includes(message.role))
                      .map(({ message }) => `${message.role}: ${message.content}`),
                    'user: ',
                    t('demo.generate-continue'),
                  ]),
            ].join('\n\n'),
          },
        ],
      });

      await this.run(session, content, commit);
    }
  }

  static formatSessionInfo(clock: Clock, session: Session, t: Translate): string {
    const lines = [];

    const topicStatusMap: Record<TopicStatus, string> = {
      pending: t('session-info.status.pending'),
      in_progress: t('session-info.status.in_progress'),
      done: t('session-info.status.done'),
    };

    lines.push(t('session-info.plan-heading'), '');

    if (session.topics.length > 0) {
      for (const { id, label, status } of session.topics) {
        lines.push(`${label} (id: "${id}") : ${topicStatusMap[status]}`);
      }

      if (session.topics.filter((topic) => topic.status === 'in_progress').length !== 1) {
        lines.push('', t('session-info.no-topic-in-progress'));
      } else {
        lines.push('', t('session-info.plan-up-to-date'));
      }
    } else {
      lines.push(t('session-info.no-plan'));
    }

    lines.push('', t('session-info.time-heading'), '');
    lines.push(this.formatTimerInfo(clock, session, t));

    if (session.notes.length > 0) {
      lines.push('', t('session-info.notes-heading'), '');

      for (const { id, content } of session.notes) {
        lines.push(`id: ${id}`);
        lines.push(`note: ${content}`, '');
      }
    }

    return lines.join('\n');
  }

  static formatTimerInfo(clock: Clock, session: Session, t: Translate) {
    if (!session.timer) {
      return t('timer-info.none');
    }

    const duration = intervalToDuration({
      start: session.timer.startedAt,
      end: session.timer.pausedAt ?? clock.now(),
    });

    const elapsed = (duration.minutes ?? 0) + (duration.hours ?? 0) * 60;
    const remaining = Math.max(0, session.timer.duration - (elapsed ?? 0));

    const lines: string[] = [];

    lines.push(t('timer-info.session-time', { minutes: session.timer.duration }));
    lines.push(t('timer-info.elapsed', { minutes: elapsed }));
    lines.push(t('timer-info.remaining', { minutes: remaining }));

    if (remaining === 0) {
      lines.push('', t('timer-info.time-up'));
    }

    if (session.timer.pausedAt) {
      lines.push('', t('timer-info.paused'));
    }

    return lines.join('\n');
  }

  private async handleToolCall(session: Session, toolCall: ToolCall) {
    const localizedTools = tools[session.language];

    assert(hasKey(localizedTools, toolCall.name), new Error(`Unknown tool name: "${toolCall.name}"`));

    try {
      const tool: Tool<z.ZodType<any>> = localizedTools[toolCall.name];

      toolCall.arguments = tool.param.parse(toolCall.arguments);

      session.addToolCallResult(toolCall.id, {
        result: await tool.execute(session, toolCall.arguments),
      });
    } catch (error) {
      session.addToolCallResult(toolCall.id, { error: Assistant.toErrorMessage(error) });
    }
  }

  private static toErrorMessage(error: unknown): string {
    if (error instanceof z.ZodError) {
      return error.issues.map((issue) => issue.message).join('; ');
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

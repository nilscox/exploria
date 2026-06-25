import z from 'zod';

import { assert, hasKey } from '../utils';
import { createTranslate } from './i18n';
import { toChatMessages } from './projections/chat-context';
import { tools } from './tools';

import type { AiClient } from '../adapters/ai-client';
import type { Clock } from '../adapters/clock';
import type { I18n } from '../adapters/i18n';
import type { Session, ToolCall } from './session';
import type { Tool } from './tools/create-tool';
import type { UiEvent, UiNotifier } from './ui-notifier';

export type AssistantUiEvent = UiEvent<'Chunk', { text: string }>;

export class Assistant {
  private readonly clock: Clock;
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly aiClient: AiClient;
  private readonly i18n: I18n;

  constructor(clock: Clock, uiNotifier: UiNotifier, aiClient: AiClient, i18n: I18n) {
    this.clock = clock;
    this.uiNotifier = uiNotifier;
    this.aiClient = aiClient;
    this.i18n = i18n;
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
          content: this.i18n.render(session.language, 'session-info', { session }),
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

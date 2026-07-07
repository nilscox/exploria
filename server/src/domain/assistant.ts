import z from 'zod';

import { assert, hasKey } from '../utils.ts';
import { toChatMessages } from './projections/chat-context.ts';

import type { AiClient } from '../adapters/ai-client.ts';
import type { I18n } from '../adapters/i18n.ts';
import type { FacilitatorTools, Tool } from './assistant-tools.ts';
import type { Session, ToolCall } from './session.ts';
import type { SummaryGenerator } from './summary-generator.ts';
import type { Summary } from './summary.ts';
import type { UiEvent, UiNotifier } from './ui-notifier.ts';

export type AssistantUiEvent = UiEvent<'Chunk', { text: string }>;

export interface IAssistant {
  run(session: Session, message?: string, commit?: () => Promise<void>): Promise<void>;
  generateDemo(session: Session, commit?: () => Promise<void>): Promise<void>;
  generateSummary(session: Session): Promise<Summary>;
}

export class Assistant implements IAssistant {
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly aiClient: AiClient;
  private readonly i18n: I18n;
  private readonly summaryGenerator: SummaryGenerator;
  private readonly facilitatorTools: FacilitatorTools;

  constructor(
    uiNotifier: UiNotifier,
    aiClient: AiClient,
    i18n: I18n,
    summaryGenerator: SummaryGenerator,
    facilitatorTools: FacilitatorTools,
  ) {
    this.uiNotifier = uiNotifier;
    this.aiClient = aiClient;
    this.i18n = i18n;
    this.summaryGenerator = summaryGenerator;
    this.facilitatorTools = facilitatorTools;
  }

  async run(session: Session, message?: string, commit?: () => Promise<void>) {
    if (message) {
      session.addMessage('user', message);
      await commit?.();
    }

    while (true) {
      const { content, toolCalls } = await this.aiClient.createCompletionStreaming({
        model: session.model,
        tools: this.availableTools(session),
        messages: this.buildMessages(session),
        onChunk: (text) => this.uiNotifier.notify(session.id, { type: 'Chunk', text }),
      });

      if (content === '' && toolCalls.length === 0) {
        break;
      }

      if (content !== '') {
        session.addMessage('assistant', content, { model: session.model });
      }

      let regenerate = content === '';

      for (const toolCall of toolCalls) {
        const terminal = await this.handleToolCall(session, toolCall);

        if (!terminal) {
          regenerate = true;
        }
      }

      await commit?.();

      if (!regenerate) {
        break;
      }
    }
  }

  async generateDemo(session: Session, commit?: () => Promise<void>) {
    const t = this.i18n.translate(session.language);

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

  async generateSummary(session: Session) {
    const summary = await this.summaryGenerator.generate(session);

    session.addSummary(summary);

    return summary;
  }

  private buildMessages(session: Session) {
    const t = this.i18n.translate(session.language);

    return [
      {
        role: 'system' as const,
        content: this.i18n.render(session.language, 'instructions', {}),
      },
      ...toChatMessages(session.events, t),
      {
        role: 'system' as const,
        content: this.i18n.render(session.language, 'session-info', { session }),
      },
    ];
  }

  private async handleToolCall(session: Session, toolCall: ToolCall): Promise<boolean> {
    const tools = this.availableTools(session);

    assert(hasKey(tools, toolCall.name), new Error(`Unknown tool name: "${toolCall.name}"`));

    const tool: Tool<z.ZodType<any>> = tools[toolCall.name] as Tool<z.ZodType<any>>;

    try {
      toolCall.arguments = tool.param.parse(toolCall.arguments);

      session.recordToolCall(toolCall, 'facilitator', {
        result: await tool.execute(session, toolCall.arguments),
      });
    } catch (error) {
      session.recordToolCall(toolCall, 'facilitator', { error: Assistant.toErrorMessage(error) });
    }

    return tool.terminal ?? false;
  }

  private availableTools(session: Session) {
    const tools: Partial<ReturnType<FacilitatorTools>> = this.facilitatorTools(session.language);

    if (session.postureMode === 'forced') {
      delete tools.setPosture;
    }

    return tools;
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

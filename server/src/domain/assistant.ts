import type z from 'zod';

import { assert, hasKey, type ValueOf } from '../utils.ts';
import { toErrorMessage } from './assistant-tools.ts';
import { toChatMessages } from './projections/chat-context.ts';

import type { AiClient } from '../adapters/ai-client.ts';
import type { I18n } from '../adapters/i18n.ts';
import type { Logger } from '../adapters/logger.ts';
import type { Dependencies } from '../di.ts';
import type { FacilitatorTools, Tool } from './assistant-tools.ts';
import type { Curator } from './curator.ts';
import type { Session, ToolCall } from './session.ts';
import type { UiEvent, UiNotifier } from './ui-notifier.ts';

export type AssistantUiEvent = UiEvent<'Chunk', { text: string }>;

export interface IAssistant {
  run(session: Session, message?: string, commit?: () => Promise<void>): Promise<void>;
}

export class Assistant implements IAssistant {
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly aiClient: AiClient;
  private readonly i18n: I18n;
  private readonly facilitatorTools: FacilitatorTools;
  private readonly curator: Curator;
  private readonly logger: Logger;

  constructor({
    uiNotifier,
    aiClient,
    i18n,
    facilitatorTools,
    curator,
    logger,
  }: Dependencies<'uiNotifier' | 'aiClient' | 'i18n' | 'facilitatorTools' | 'curator' | 'logger'>) {
    this.uiNotifier = uiNotifier;
    this.aiClient = aiClient;
    this.i18n = i18n;
    this.facilitatorTools = facilitatorTools;
    this.curator = curator;
    this.logger = logger;
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

    try {
      await this.curator.run(session);
      await commit?.();
    } catch (error) {
      this.logger.error('curator failed', error);
    }
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
      session.recordToolCall(toolCall, 'facilitator', { error: toErrorMessage(error) });
    }

    return tool.terminal ?? false;
  }

  private availableTools(session: Session) {
    const tools: Partial<ValueOf<FacilitatorTools>> = this.facilitatorTools[session.language];

    const hasChangedPosture =
      session.events.at(-1)?.type === 'ToolCalled' && session.events.at(-2)?.type === 'PostureChanged';

    if (session.postureMode === 'forced' || hasChangedPosture) {
      delete tools.setPosture;
    }

    return tools;
  }
}

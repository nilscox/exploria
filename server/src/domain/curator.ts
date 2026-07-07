import type z from 'zod';

import { assert, hasKey, type ValueOf } from '../utils.ts';
import { toErrorMessage } from './assistant-tools.ts';
import { toChatMessages } from './projections/chat-context.ts';

import type { AiClient, AiClientMessage } from '../adapters/ai-client.ts';
import type { I18n } from '../adapters/i18n.ts';
import type { CuratorTools, Tool } from './assistant-tools.ts';
import type { Session, ToolCall } from './session.ts';

export class Curator {
  private static readonly maxIterations = 3;

  private readonly aiClient: AiClient;
  private readonly i18n: I18n;
  private readonly curatorTools: CuratorTools;

  constructor(aiClient: AiClient, i18n: I18n, curatorTools: CuratorTools) {
    this.aiClient = aiClient;
    this.i18n = i18n;
    this.curatorTools = curatorTools;
  }

  async run(session: Session): Promise<void> {
    const t = this.i18n.translate(session.language);
    const tools = this.curatorTools[session.language];

    const messages: AiClientMessage[] = [
      { role: 'system', content: this.i18n.render(session.language, 'curator', { session }) },
      ...toChatMessages(session.events, t),
    ];

    for (let iteration = 0; iteration < Curator.maxIterations; iteration++) {
      const { content, toolCalls } = await this.aiClient.createCompletion({
        model: session.model,
        tools,
        messages,
      });

      if (toolCalls.length === 0) {
        break;
      }

      messages.push({ role: 'assistant', content, toolCalls });

      for (const toolCall of toolCalls) {
        messages.push({
          role: 'tool',
          toolCallId: toolCall.id,
          content: await this.handleToolCall(session, tools, toolCall),
        });
      }
    }
  }

  private async handleToolCall(session: Session, tools: ValueOf<CuratorTools>, toolCall: ToolCall): Promise<unknown> {
    assert(hasKey(tools, toolCall.name), new Error(`Unknown tool name: "${toolCall.name}"`));

    const tool: Tool<z.ZodType<any>> = tools[toolCall.name] as Tool<z.ZodType<any>>;

    try {
      toolCall.arguments = tool.param.parse(toolCall.arguments);

      const result = await tool.execute(session, toolCall.arguments);

      session.recordToolCall(toolCall, 'curator', { result });

      return result;
    } catch (error) {
      const message = toErrorMessage(error);

      session.recordToolCall(toolCall, 'curator', { error: message });

      return { error: message };
    }
  }
}

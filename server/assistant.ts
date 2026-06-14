import EventEmitter from 'node:events';
import type OpenAI from 'openai';
import type { Stream } from 'openai/core/streaming.mjs';
import type { ChatCompletionTool } from 'openai/resources/index.mjs';
import type z from 'zod';

import { tools } from './tools';
import { assert } from './utils';

import type { Session } from './session';
import type { Tool } from './tools/tool';
import type { Plan, TopicStatus } from './types';

const toolsDefinitions = tools.map(
  (tool) =>
    ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.param.toJSONSchema(),
      },
    }) satisfies ChatCompletionTool,
);

export class Assistant extends EventEmitter<{ chunk: [text: string] }> {
  private client: OpenAI;
  private model: string;

  constructor(client: OpenAI, model: string) {
    super();

    this.client = client;
    this.model = model;
  }

  async run(session: Session) {
    const stream = await this.client.chat.completions.create(this.createChatCompletionRequest(session));
    const { content, toolCalls } = await this.handleStream(stream);

    session.addMessage({
      role: 'assistant',
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    for (const toolCall of toolCalls) {
      await this.handleToolCall(session, toolCall);
    }

    if (toolCalls.length > 0) {
      await this.run(session);
    }
  }

  private createChatCompletionRequest(session: Session): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
    return {
      model: this.model,
      messages: [
        ...session.messages,
        {
          role: 'system',
          content: Assistant.serializePlan(session.plan),
        },
      ],
      tools: toolsDefinitions,
      tool_choice: 'auto',
      stream: true,
    };
  }

  static serializePlan(plan: Plan): string {
    if (plan.topics.length === 0) {
      return 'Aucun plan défini.';
    }

    const statusMap: Record<TopicStatus, string> = {
      pending: 'à traiter',
      in_progress: 'en cours',
      done: 'traité',
    };

    const lines = plan.topics.map((t) => {
      return `${t.label} : ${statusMap[t.status]} (id: "${t.id}")`;
    });

    return `Plan de discussion\n\n${lines.join('\n')}`;
  }

  private async handleStream(stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>) {
    let content = '';
    const toolCalls: Array<OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall> = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        content += delta.content;
        this.emit('chunk', delta.content);
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          toolCalls[tc.index] ??= {
            id: '',
            type: 'function',
            function: { name: '', arguments: '' },
          };

          const call = toolCalls[tc.index]!;

          if (tc.id) call.id = tc.id;
          if (tc.function?.name) call.function.name += tc.function.name;
          if (tc.function?.arguments) call.function.arguments += tc.function.arguments;
        }
      }
    }

    return {
      content,
      toolCalls,
    };
  }

  private async handleToolCall(
    session: Session,
    { id, function: fn }: OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall,
  ) {
    const tool: Tool<z.ZodType> | undefined = tools.find((tool) => tool.name === fn.name);

    assert(tool);

    const args = tool.param.parse(JSON.parse(fn.arguments));
    const result = await tool.execute(session, args);

    session.addMessage({
      role: 'tool',
      tool_call_id: id,
      content: result,
    });
  }
}

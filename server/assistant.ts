import EventEmitter from 'node:events';
import type OpenAI from 'openai';
import type { Stream } from 'openai/core/streaming.mjs';
import type { ChatCompletionTool } from 'openai/resources/index.mjs';
import type z from 'zod';

import { tools } from './tools';
import { assert, createId } from './utils';

import type { Message, Note, ToolCall, TopicStatus } from '../shared';
import type { Session } from './session';
import type { Tool } from './tools/tool';

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
      id: createId(),
      role: 'assistant',
      content,
      toolCalls,
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
          id: '',
          role: 'system' as const,
          content: Assistant.serializeSessionInfo(session),
        } satisfies Message,
      ].map(Assistant.messageToOpenAI),
      tools: toolsDefinitions,
      tool_choice: 'auto',
      stream: true,
    };
  }

  static serializeSessionInfo(session: Session): string {
    const lines = [];

    const topicStatusMap: Record<TopicStatus, string> = {
      pending: 'à traiter',
      in_progress: 'en cours',
      done: 'traité',
    };

    lines.push('# Plan de discussion', '');

    if (session.topics.length > 0) {
      for (const { id, label, status } of session.topics) {
        lines.push(`${label} (id: "${id}") : ${topicStatusMap[status]}`);
      }

      if (session.topics.filter((topic) => topic.status === 'in_progress').length !== 1) {
        lines.push('', 'Aucun sujet en cours. Faut-il en mettre un à jour ?');
      } else {
        lines.push('', 'Est-ce que le plan est à jour ?');
      }
    } else {
      lines.push('Aucun plan défini.');
    }

    if (session.notes.length > 0) {
      lines.push('', '# Notes', '');

      for (const { id, content } of session.notes) {
        lines.push(`id: ${id}`);
        lines.push(`note: ${content}`, '');
      }
    }

    console.log(lines);

    return lines.join('\n');
  }

  static serializeNotes(notes: Note[]): string {
    if (notes.length === 0) {
      return 'Aucun note sauvegardée.';
    }

    return `Notes sauvegardées :\n\n${notes.map((note) => note.content).join('\n\n---\n\n')}`;
  }

  private async handleStream(stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>) {
    let content = '';
    const toolCalls: Array<ToolCall> = [];

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
            name: '',
            arguments: '',
          };

          const call = toolCalls[tc.index]!;

          if (tc.id) call.id = tc.id;
          if (tc.function?.name) call.name += tc.function.name;
          if (tc.function?.arguments) call.arguments += tc.function.arguments;
        }
      }
    }

    return {
      content,
      toolCalls,
    };
  }

  private async handleToolCall(session: Session, { id, name, arguments: arguments_ }: ToolCall) {
    const tool: Tool<z.ZodType> | undefined = tools.find((tool) => tool.name === name);

    assert(tool);

    const args = tool.param.parse(JSON.parse(arguments_));
    const result = await tool.execute(session, args);

    session.addMessage({
      id: createId(),
      role: 'tool',
      toolCallId: id,
      content: result,
    });
  }

  private static messageToOpenAI(this: void, message: Message): OpenAI.Chat.Completions.ChatCompletionMessageParam {
    const content = message.content;

    if (message.role === 'system' || message.role === 'user') {
      return { role: message.role, content };
    }

    if (message.role === 'tool') {
      return { role: message.role, tool_call_id: message.toolCallId, content };
    }

    return {
      role: message.role,
      content: message.content,
      tool_calls: message.toolCalls?.map(({ id, name, arguments: args }) => ({
        id,
        type: 'function' as const,
        function: { name, arguments: JSON.stringify(args) },
      })),
    };
  }
}

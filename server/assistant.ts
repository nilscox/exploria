import { intervalToDuration } from 'date-fns';
import EventEmitter from 'node:events';
import type OpenAI from 'openai';
import type { Stream } from 'openai/core/streaming.mjs';
import type { ChatCompletionTool } from 'openai/resources/index.mjs';
import type z from 'zod';

import { di } from './di';
import { tools } from './tools';
import { assert, createId, hasKey } from './utils';

import type { Message, ToolCall, TopicStatus } from '../shared';
import type { Session } from './session';
import type { Tool } from './tools/create-tool';

const toolsDefinitions = Object.entries(tools).map(
  ([name, tool]) =>
    ({
      type: 'function',
      function: {
        name,
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
    const dateAdapter = di.resolve('date');
    const stream = await this.client.chat.completions.create(this.createChatCompletionRequest(session));
    const { content, toolCalls } = await this.handleStream(stream);

    session.addMessage({
      id: createId(),
      date: dateAdapter.now().toISOString(),
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
    const dateAdapter = di.resolve('date');

    return {
      model: this.model,
      messages: [
        ...session.messages,
        {
          id: '',
          date: dateAdapter.now().toISOString(),
          role: 'system' as const,
          content: Assistant.formatSessionInfo(session),
        } satisfies Message,
      ].map(Assistant.messageToOpenAI),
      tools: toolsDefinitions,
      tool_choice: 'auto',
      stream: true,
    };
  }

  static formatSessionInfo(session: Session): string {
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
        lines.push('', 'Le plan est-il à jour par rapport à la discussion ?');
      }
    } else {
      lines.push('Aucun plan défini.');
    }

    lines.push('', '# Gestion du temps', '');
    lines.push(this.formatTimerInfo(session));

    if (session.notes.length > 0) {
      lines.push('', '# Notes', '');

      for (const { id, content } of session.notes) {
        lines.push(`id: ${id}`);
        lines.push(`note: ${content}`, '');
      }
    }

    return lines.join('\n');
  }

  static formatTimerInfo(session: Session) {
    const dateAdapter = di.resolve('date');

    if (!session.timer) {
      return 'Aucun chronomètre démarré';
    }

    const duration = intervalToDuration({
      start: session.timer.startedAt,
      end: session.timer.pausedAt ?? dateAdapter.now(),
    });

    const elapsed = (duration.minutes ?? 0) + (duration.hours ?? 0) * 60;
    const remaining = Math.max(0, session.timer.duration - (elapsed ?? 0));

    const lines: string[] = [];

    lines.push(`Temps de la session : ${session.timer.duration} minutes`);
    lines.push(`Temps écoulé : ${elapsed} minutes`);
    lines.push(`Temps restant : ${remaining} minutes`);

    if (remaining === 0) {
      lines.push('', 'Temps imparti écoulé, il est nécessaire de conclure');
    }

    if (session.timer.pausedAt) {
      lines.push('', `Chronomètre en pause`);
    }

    return lines.join('\n');
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

  private async handleToolCall(session: Session, toolCall: ToolCall) {
    const dateAdapter = di.resolve('date');

    assert(hasKey(tools, toolCall.name), new Error(`Unknown tool name: "${toolCall.name}"`));
    assert(typeof toolCall.arguments === 'string');

    const tool: Tool<z.ZodType<any>> = tools[toolCall.name];
    const args = JSON.parse(toolCall.arguments);
    let content: string;

    try {
      toolCall.arguments = tool.param.parse(args);
      toolCall.result = await tool.execute(session, toolCall.arguments);
      content = typeof toolCall.result === 'string' ? toolCall.result : JSON.stringify(toolCall.result);
    } catch (error) {
      toolCall.error = error;
      content = error instanceof Error ? `Error: ${error.message}` : 'Unknown error';
    }

    session.addMessage({
      id: createId(),
      date: dateAdapter.now().toISOString(),
      role: 'tool',
      toolCallId: toolCall.id,
      content,
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

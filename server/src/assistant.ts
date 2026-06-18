import { intervalToDuration } from 'date-fns';
import type OpenAI from 'openai';
import type { Stream } from 'openai/core/streaming.mjs';
import type { ChatCompletionTool } from 'openai/resources/index.mjs';
import type z from 'zod';

import { tools } from './tools';
import { assert, hasKey } from './utils';

import type { Clock } from './di';
import type { Message, Session, ToolCall, TopicStatus } from './domain/session';
import type { UiEvent, UiNotifier } from './domain/ui-notifier';
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

export type AssistantUiEvent = UiEvent<'Chunk', { text: string }>;

export class Assistant {
  private readonly clock: Clock;
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly client: OpenAI;

  constructor(clock: Clock, uiNotifier: UiNotifier, openAiClient: OpenAI) {
    this.clock = clock;
    this.uiNotifier = uiNotifier;
    this.client = openAiClient;
  }

  async run(session: Session, message?: string) {
    if (message) {
      session.addMessage('user', message);
    }

    const stream = await this.client.chat.completions.create(this.createChatCompletionRequest(session));
    const { content, toolCalls } = await this.handleStream(session, stream);

    session.addMessage('assistant', content, {
      model: session.model,
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
      model: session.model,
      messages: [
        ...session.messages,
        {
          id: '',
          date: this.clock.now().toISOString(),
          role: 'system' as const,
          content: Assistant.formatSessionInfo(this.clock, session),
        } satisfies Message,
      ].map(Assistant.messageToOpenAI),
      tools: toolsDefinitions,
      tool_choice: 'auto',
      stream: true,
    };
  }

  static formatSessionInfo(clock: Clock, session: Session): string {
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
    lines.push(this.formatTimerInfo(clock, session));

    if (session.notes.length > 0) {
      lines.push('', '# Notes', '');

      for (const { id, content } of session.notes) {
        lines.push(`id: ${id}`);
        lines.push(`note: ${content}`, '');
      }
    }

    return lines.join('\n');
  }

  static formatTimerInfo(clock: Clock, session: Session) {
    if (!session.timer) {
      return 'Aucun chronomètre démarré';
    }

    const duration = intervalToDuration({
      start: session.timer.startedAt,
      end: session.timer.pausedAt ?? clock.now(),
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

  private async handleStream(session: Session, stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>) {
    let content = '';
    const toolCalls: Array<ToolCall> = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        content += delta.content;
        this.uiNotifier.notify(session.id, { type: 'Chunk', text: delta.content });
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

    session.addToolCallResult(toolCall.id, content);
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

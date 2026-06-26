import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';

import { assert, defined } from '../utils';

import type { Tool } from '../domain/assistant-tools';
import type { Config } from './config';

export type AiClientMessage =
  | {
      role: 'system' | 'user';
      content: string;
    }
  | {
      role: 'assistant';
      content: string;
      toolCalls?: AiClientToolCall[];
    }
  | {
      role: 'tool';
      toolCallId: string;
      content: unknown;
    };

export type AiClientToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

type CreateCompletionParams = {
  model: string;
  messages: AiClientMessage[];
  tools?: Record<string, Tool>;
};

type CreateCompletionStreamingParams = CreateCompletionParams & {
  onChunk: (text: string) => void;
};

type CreateCompletionResult = {
  content: string;
  toolCalls: AiClientToolCall[];
};

export class StubAiClient {
  results: CreateCompletionResult[] = [];

  private next = async () => {
    if (this.results.length === 0) {
      return { content: '', toolCalls: [] };
    }

    return defined(this.results.shift());
  };

  createCompletion = this.next;
  createCompletionStreaming = this.next;
}

export interface AiClient {
  createCompletion(params: CreateCompletionParams): Promise<CreateCompletionResult>;
  createCompletionStreaming(params: CreateCompletionStreamingParams): Promise<CreateCompletionResult>;
}

export class OpenAiClient implements AiClient {
  private client: OpenAI;

  constructor(config: Config) {
    this.client = new OpenAI({
      baseURL: config.openAi.baseUrl,
      apiKey: config.openAi.apiKey,
    });
  }

  async createCompletion({ model, messages, tools }: CreateCompletionParams): Promise<CreateCompletionResult> {
    const result = await this.client.chat.completions.create({
      model,
      messages: messages.map(OpenAiClient.mapMessage),
      tools: OpenAiClient.mapTools(tools),
      tool_choice: 'auto',
    });

    assert(result.choices[0]);
    assert(result.choices[0].message.content);

    return {
      content: result.choices[0].message.content,
      toolCalls: result.choices[0].message.tool_calls?.map(OpenAiClient.mapOpenAiToolCall) ?? [],
    };
  }

  async createCompletionStreaming({
    model,
    messages,
    tools,
    onChunk,
  }: CreateCompletionStreamingParams): Promise<CreateCompletionResult> {
    const stream = await this.client.chat.completions.create({
      model,
      messages: messages.map(OpenAiClient.mapMessage),
      tools: OpenAiClient.mapTools(tools),
      tool_choice: 'auto',
      stream: true,
    });

    return this.handleStream(stream, onChunk);
  }

  private async handleStream(
    stream: Stream<OpenAI.Chat.Completions.ChatCompletionChunk>,
    onChunk: (text: string) => void,
  ): Promise<CreateCompletionResult> {
    let content = '';
    const toolCalls: Array<OpenAI.Chat.Completions.ChatCompletionMessageToolCall> = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        content += delta.content;
        onChunk(delta.content);
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          toolCalls[tc.index] ??= {
            id: '',
            type: 'function',
            function: {
              name: '',
              arguments: '',
            },
          };

          const call = toolCalls[tc.index]!;
          assert(call.type === 'function');

          if (tc.id) call.id = tc.id;
          if (tc.function?.name) call.function.name += tc.function.name;
          if (tc.function?.arguments) call.function.arguments += tc.function.arguments;
        }
      }
    }

    return {
      content,
      toolCalls: toolCalls.map(OpenAiClient.mapOpenAiToolCall),
    };
  }

  private static mapMessage = (message: AiClientMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

    if (message.role === 'assistant') {
      return {
        role: message.role,
        content,
        tool_calls: message.toolCalls?.map(this.mapToolCall),
      };
    }

    if (message.role === 'tool') {
      return {
        role: message.role,
        tool_call_id: message.toolCallId,
        content,
      };
    }

    return {
      role: message.role,
      content,
    };
  };

  private static mapToolCall = (toolCall: AiClientToolCall): OpenAI.Chat.Completions.ChatCompletionMessageToolCall => {
    return {
      id: toolCall.id,
      type: 'function',
      function: {
        name: toolCall.name,
        arguments: JSON.stringify(toolCall.arguments),
      },
    };
  };

  private static mapOpenAiToolCall = (
    toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  ): AiClientToolCall => {
    assert(toolCall.type === 'function');

    return {
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments),
    };
  };

  private static mapTools = (tools?: Record<string, Tool>): OpenAI.Chat.Completions.ChatCompletionTool[] => {
    return Object.entries(tools ?? {}).map(([name, tool]) => this.mapTool(name, tool));
  };

  private static mapTool = (name: string, tool: Tool): OpenAI.Chat.Completions.ChatCompletionTool => {
    return {
      type: 'function',
      function: {
        name,
        description: tool.description,
        parameters: tool.param.toJSONSchema(),
      },
    };
  };
}

import OpenAI from 'openai';

import { tools } from './tools';
import { handleToolCall } from './tools/handlers';

import type { Message, Plan, Session, Topic } from './types';

const client = new OpenAI({
  apiKey: process.env.MAMMOUTH_API_KEY,
  baseURL: 'https://api.mammouth.ai/v1',
});

export async function runTurn(
  { plan, messages }: Session,
  onChunk: (text: string) => void,
  onPlanUpdate: (plan: Plan) => void,
): Promise<{ messages: Message[]; plan: Plan }> {
  // Injecter l'état du plan dans le contexte
  const messagesWithContext: Message[] = [
    ...messages,
    {
      role: 'system',
      content: serializePlan(plan),
    },
  ];

  const stream = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: messagesWithContext,
    tools,
    tool_choice: 'auto',
    stream: true,
  });

  let assistantText = '';
  const toolCalls: OpenAI.ChatCompletionMessageFunctionToolCall[] = [];

  // Accumulation du stream
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;

    if (delta?.content) {
      assistantText += delta.content;
      onChunk(delta.content);
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        if (!toolCalls[tc.index]) {
          toolCalls[tc.index] = {
            id: '',
            type: 'function',
            function: { name: '', arguments: '' },
          };
        }

        if (tc.id) toolCalls[tc.index]!.id = tc.id;
        if (tc.function?.name) toolCalls[tc.index]!.function.name += tc.function.name;
        if (tc.function?.arguments) toolCalls[tc.index]!.function.arguments += tc.function.arguments;
      }
    }
  }

  // Ajouter la réponse assistant à l'historique
  const assistantMessage: Message = {
    role: 'assistant',
    content: assistantText || null,
    tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
  };
  messages = [...messages, assistantMessage];

  // Exécuter les tool calls
  let currentPlan = plan;
  for (const tc of toolCalls) {
    const args = JSON.parse(tc.function.arguments);
    const { result, plan: updatedPlan } = handleToolCall(tc.function.name, args, currentPlan);
    currentPlan = updatedPlan;
    onPlanUpdate(currentPlan);

    // Injecter le résultat dans l'historique
    messages = [
      ...messages,
      {
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      },
    ];
  }

  // Si des tools ont été appelés → relancer le LLM pour qu'il réponde
  if (toolCalls.length > 0) {
    return runTurn({ plan: currentPlan, messages }, onChunk, onPlanUpdate);
  }

  return { messages, plan: currentPlan };
}

function serializePlan(plan: Plan): string {
  if (plan.topics.length === 0) return '(aucun plan défini)';

  const icons: Record<Topic['status'], string> = {
    pending: '⬜',
    active: '🔄',
    done: '✅',
  };

  const lines = plan.topics.map((t) => {
    return `${icons[t.status]} ${t.label}`;
  });

  return `## Plan de discussion\n\n${lines.join('\n')}`;
}

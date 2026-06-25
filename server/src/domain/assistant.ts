import { intervalToDuration } from 'date-fns';
import type z from 'zod';

import { assert, hasKey } from '../utils';
import { toChatMessages } from './projections/chat-context';
import { tools } from './tools';

import type { AiClient } from '../adapters/ai-client';
import type { Clock } from '../adapters/clock';
import type { Session, ToolCall, TopicStatus } from './session';
import type { Tool } from './tools/create-tool';
import type { UiEvent, UiNotifier } from './ui-notifier';

export type AssistantUiEvent = UiEvent<'Chunk', { text: string }>;

export class Assistant {
  private readonly clock: Clock;
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly aiClient: AiClient;

  constructor(clock: Clock, uiNotifier: UiNotifier, aiClient: AiClient) {
    this.clock = clock;
    this.uiNotifier = uiNotifier;
    this.aiClient = aiClient;
  }

  async run(session: Session, message?: string) {
    if (message) {
      session.addMessage('user', message);
    }

    const { content, toolCalls } = await this.aiClient.createCompletionStreaming({
      model: session.model,
      tools,
      messages: [
        ...toChatMessages(session.events),
        {
          role: 'system',
          content: Assistant.formatSessionInfo(this.clock, session),
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

    if (toolCalls.length > 0) {
      await this.run(session);
    }
  }

  async generateDemo(session: Session) {
    for (let i = 0; i <= 3; ++i) {
      const { content } = await this.aiClient.createCompletion({
        model: session.model,
        messages: [
          {
            role: 'system',
            content: [
              "Tu cherches à réfléchir à un sujet de manière guidée. Ce n'est pas toi qui guide la discussion, tu te laisses guider.",
              'Tu joue le role "user" et non pas "assistant", dans le but de créer un exemple de conversation.',
              ...(i === 0
                ? [
                    'Invente un sujet de réflexion complexe : par exemple, un choix de vie, une décision technique ou une question philosophie. Ne propose pas plusieurs options, énonce simplement le sujet choisi en quelques mots.',
                  ]
                : [
                    'Voici le début de la conversation.',
                    ...session.events
                      .filter((event) => event.type === 'MessageAdded')
                      .filter(({ message }) => message.content !== '')
                      .filter(({ message }) => ['user', 'assistant'].includes(message.role))
                      .map(({ message }) => `${message.role}: ${message.content}`),
                    'user: ',
                    'Génère un message court pour continuer la discussion.',
                  ]),
            ].join('\n\n'),
          },
        ],
      });

      await this.run(session, content);
    }
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

  private async handleToolCall(session: Session, toolCall: ToolCall) {
    assert(hasKey(tools, toolCall.name), new Error(`Unknown tool name: "${toolCall.name}"`));

    try {
      const tool: Tool<z.ZodType<any>> = tools[toolCall.name];

      toolCall.arguments = tool.param.parse(toolCall.arguments);

      session.addToolCallResult(toolCall.id, {
        result: await tool.execute(session, toolCall.arguments),
      });
    } catch (error) {
      session.addToolCallResult(toolCall.id, { error });
    }
  }
}

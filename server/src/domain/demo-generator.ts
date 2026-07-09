import { toChatMessages } from './projections/chat-context.ts';

import type { AiClient, AiClientMessage } from '../adapters/ai-client.ts';
import type { I18n } from '../adapters/i18n.ts';
import type { Dependencies } from '../di.ts';
import type { IAssistant } from './assistant.ts';
import type { Session } from './session.ts';

export class DemoGenerator {
  private readonly aiClient: AiClient;
  private readonly i18n: I18n;
  private readonly assistant: IAssistant;

  constructor({ aiClient, i18n, assistant }: Dependencies<'aiClient' | 'i18n' | 'assistant'>) {
    this.aiClient = aiClient;
    this.i18n = i18n;
    this.assistant = assistant;
  }

  async generate(session: Session, commit: () => Promise<void>, subject?: string, count = 4) {
    for (let index = 0; index < count; index++) {
      const message = await this.generateMessage(session, index === 0, subject);

      await this.assistant.run(session, message, commit);
    }
  }

  private async generateMessage(session: Session, first: boolean, subject?: string): Promise<string> {
    const t = this.i18n.translate(session.language);

    const { content } = await this.aiClient.createCompletion({
      model: session.model,
      messages: [
        {
          role: 'system',
          content: this.i18n.render(session.language, 'demo', { first, subject }),
        },
        ...DemoGenerator.fromUserPerspective(toChatMessages(session.events, t)),
      ],
    });

    return content;
  }

  private static fromUserPerspective(messages: AiClientMessage[]): AiClientMessage[] {
    return messages.map((message) => {
      if (message.role === 'user') {
        return { role: 'assistant', content: message.content };
      }

      if (message.role === 'assistant') {
        return { role: 'user', content: message.content };
      }

      return message;
    });
  }
}

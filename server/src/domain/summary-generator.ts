import { toChatMessages } from './projections/chat-context';
import { summarySchema } from './summary';

import type { AiClient } from '../adapters/ai-client';
import type { I18n } from '../adapters/i18n';
import type { Session } from './session';
import type { Summary } from './summary';

export class SummaryGenerator {
  private readonly aiClient: AiClient;
  private readonly i18n: I18n;

  constructor(aiClient: AiClient, i18n: I18n) {
    this.aiClient = aiClient;
    this.i18n = i18n;
  }

  async generate(session: Session): Promise<Summary> {
    const t = this.i18n.translate(session.language);

    const messages = [
      {
        role: 'system' as const,
        content: this.i18n.render(session.language, 'summary', {}),
      },
      ...toChatMessages(session.events, t),
    ];

    return this.aiClient.createStructuredCompletion({
      model: session.model,
      messages,
      schema: summarySchema,
    });
  }
}

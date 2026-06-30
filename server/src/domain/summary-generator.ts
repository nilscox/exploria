import { toChatMessages } from './projections/chat-context.ts';
import { summarySchema } from './summary.ts';

import type { AiClient } from '../adapters/ai-client.ts';
import type { I18n } from '../adapters/i18n.ts';
import type { Session } from './session.ts';
import type { Summary } from './summary.ts';

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

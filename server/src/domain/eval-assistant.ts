import { assert } from '../utils.ts';

import type { AssistantTools } from './assistant-tools.ts';
import type { Assistant, AssistantUiEvent, IAssistant } from './assistant.ts';
import type { Summary } from './summary.ts';
import type { UiNotifier } from './ui-notifier.ts';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export class EvalAssistant implements IAssistant {
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly assistantTools: AssistantTools;

  constructor(uiNotifier: UiNotifier, assistantTools: AssistantTools) {
    this.uiNotifier = uiNotifier;
    this.assistantTools = assistantTools;
  }

  run: Assistant['run'] = async (session, message) => {
    assert(message);

    session.addMessage('user', message);

    // oxlint-disable-next-line no-eval typescript/no-implied-eval
    const fn = new AsyncFunction('session', 'tools', 'send', message);

    await fn(session, this.assistantTools(session.language), (text: string) => {
      this.uiNotifier.notify(session.id, { type: 'Chunk', text });
    });
  };

  async generateDemo(): Promise<void> {}

  async generateSummary(): Promise<Summary> {
    return {
      summary: '',
      keyPoints: [],
      biases: [],
      blindSpots: [],
      tensions: [],
      openQuestions: [],
      conclusion: null,
    };
  }
}

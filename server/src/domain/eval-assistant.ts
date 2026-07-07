import { assert } from '../utils.ts';

import type { CuratorTools, FacilitatorTools } from './assistant-tools.ts';
import type { Assistant, AssistantUiEvent, IAssistant } from './assistant.ts';
import type { Summary } from './summary.ts';
import type { UiNotifier } from './ui-notifier.ts';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export class EvalAssistant implements IAssistant {
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;
  private readonly facilitatorTools: FacilitatorTools;
  private readonly curatorTools: CuratorTools;

  constructor(uiNotifier: UiNotifier, facilitatorTools: FacilitatorTools, curatorTools: CuratorTools) {
    this.uiNotifier = uiNotifier;
    this.facilitatorTools = facilitatorTools;
    this.curatorTools = curatorTools;
  }

  run: Assistant['run'] = async (session, message) => {
    assert(message);

    session.addMessage('user', message);

    // oxlint-disable-next-line no-eval typescript/no-implied-eval
    const fn = new AsyncFunction('session', 'tools', 'send', message);

    const tools = { ...this.facilitatorTools(session.language), ...this.curatorTools(session.language) };

    await fn(session, tools, (text: string) => {
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

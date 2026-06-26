import { assert } from '../utils';
import { tools } from './tools';

import type { Assistant, AssistantUiEvent } from './assistant';
import type { UiNotifier } from './ui-notifier';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export class EvalAssistant {
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;

  constructor(uiNotifier: UiNotifier) {
    this.uiNotifier = uiNotifier;
  }

  run: Assistant['run'] = async (session, message) => {
    assert(message);

    session.addMessage('user', message);

    // oxlint-disable-next-line no-eval typescript/no-implied-eval
    const fn = new AsyncFunction('session', 'tools', 'send', message);

    await fn(session, tools, (text: string) => {
      this.uiNotifier.notify(session.id, { type: 'Chunk', text });
    });
  };
}

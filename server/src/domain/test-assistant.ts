import type { Assistant, AssistantUiEvent } from './assistant.ts';
import type { Session } from './session.ts';
import type { UiNotifier } from './ui-notifier.ts';

export class TestAssistant {
  private readonly uiNotifier: UiNotifier<AssistantUiEvent>;

  constructor(uiNotifier: UiNotifier) {
    this.uiNotifier = uiNotifier;
  }

  run: Assistant['run'] = async (session, message, commit) => {
    if (message) {
      session.addMessage('user', message);
      await commit?.();
    }

    const handler = {
      stream: () => this.stream(session, commit),
      tool: () => this.tool(session, commit),
      paths: () => this.paths(session, commit),
    }[message ?? ''];

    await handler?.();
  };

  private async stream(
    session: Session,
    commit?: () => Promise<void>,
    text = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    ].join('\n\n'),
  ) {
    let buf = text;

    while (buf.length > 0) {
      const length = Math.floor(Math.random() * 10);
      const chunk = buf.slice(0, length);

      buf = buf.slice(length);
      this.uiNotifier.notify(session.id, { type: 'Chunk', text: chunk });

      await new Promise((r) => setTimeout(r, 50));
    }

    session.addMessage('assistant', text, {
      model: session.model,
      toolCalls: [],
    });

    await commit?.();
  }

  private async tool(session: Session, commit?: () => Promise<void>) {
    session.addMessage('assistant', '', {
      model: session.model,
      toolCalls: [{ name: 'saveNote', id: 'id', arguments: { note: "I'll remember that." } }],
    });

    session.addToolCallResult('id', {
      result: 'OK',
    });

    await commit?.();

    await this.stream(session, commit, 'Note saved.');
  }

  private async paths(session: Session, commit?: () => Promise<void>) {
    session.setDiscussionPaths([
      { label: 'Path A', description: 'Some description' },
      { label: 'Path B', description: 'Some description' },
      { label: 'Path C', description: 'Some description' },
    ]);

    session.addToolCallResult('id', {
      result: 'OK',
    });

    await commit?.();

    await this.stream(session, commit, "What's next?");
  }
}

import type { Assistant, AssistantUiEvent, IAssistant } from './assistant.ts';
import type { Session } from './session.ts';
import type { Summary } from './summary.ts';
import type { UiNotifier } from './ui-notifier.ts';

export class TestAssistant implements IAssistant {
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
      questions: () => this.questions(session, commit),
    }[message ?? ''];

    await handler?.();
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

  private async stream(
    session: Session,
    commit?: () => Promise<void>,
    text = [
      //  cspell:disable
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      //  cspell:enable
    ].join('\n\n'),
  ) {
    let buf = text;

    while (buf.length > 0) {
      await new Promise((r) => setTimeout(r, 50));

      const length = Math.floor(Math.random() * 10);
      const chunk = buf.slice(0, length);

      buf = buf.slice(length);
      this.uiNotifier.notify(session.id, { type: 'Chunk', text: chunk });
    }

    session.addMessage('assistant', text, { model: session.model });

    await commit?.();
  }

  private async tool(session: Session, commit?: () => Promise<void>) {
    session.recordToolCall({ name: 'saveNote', id: 'id', arguments: { note: "I'll remember that." } }, 'curator', {
      result: 'OK',
    });

    await commit?.();

    await this.stream(session, commit, 'Note saved.');
  }

  private async questions(session: Session, commit?: () => Promise<void>) {
    session.askQuestions([
      {
        content: 'What do you think?',
        options: [
          { label: 'Option A', description: 'A description' },
          { label: 'Option B', description: 'B description' },
          { label: 'Option C', description: 'C description' },
        ],
      },
    ]);

    await commit?.();

    await this.stream(session, commit, "Here's a question for you.");
  }
}

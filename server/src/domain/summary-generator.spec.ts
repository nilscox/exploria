import assert from 'node:assert';
import { describe, it } from 'node:test';

import { StubAiClient } from '../adapters/ai-client.ts';
import { StubClock } from '../adapters/clock.ts';
import { StubGenerator } from '../adapters/generator.ts';
import { MustacheI18n } from '../adapters/i18n.ts';
import { Session } from './session.ts';
import { SummaryGenerator } from './summary-generator.ts';

const stubSummary = {
  summary: 'A thoughtful session.',
  keyPoints: ['Point A'],
  biases: [{ name: 'Confirmation bias', explanation: 'Sought confirming info.' }],
  blindSpots: [],
  tensions: [],
  openQuestions: ['What next?'],
  conclusion: null,
};

void describe('SummaryGenerator', () => {
  void it('generates a summary from session events', async () => {
    const generator = new StubGenerator();
    const clock = new StubClock();
    const aiClient = new StubAiClient();
    const i18n = new MustacheI18n({ clock });

    const session = new Session(generator, clock);

    session.addMessage('user', 'Hello');
    session.addMessage('assistant', 'Hi!', { model: 'gpt-4o' });

    aiClient.structuredResults.push(stubSummary);

    const summaryGenerator = new SummaryGenerator({ aiClient, i18n });
    const result = await summaryGenerator.generate(session);

    assert.deepStrictEqual(result, stubSummary);
  });

  void it('includes chat messages in the request', async () => {
    const generator = new StubGenerator();
    const clock = new StubClock();
    const aiClient = new StubAiClient();
    const i18n = new MustacheI18n({ clock });

    const session = new Session(generator, clock);

    session.addMessage('user', 'My first thought');
    session.addMessage('assistant', 'Interesting perspective', { model: 'gpt-4o' });

    let capturedMessages: unknown[] = [];

    aiClient.createStructuredCompletion = async ({ messages, schema }) => {
      capturedMessages = messages;
      return schema.parse(stubSummary);
    };

    const summaryGenerator = new SummaryGenerator({ aiClient, i18n });
    await summaryGenerator.generate(session);

    const systemMessage = capturedMessages[0] as { role: string; content: string };

    assert.strictEqual(systemMessage.role, 'system');
    assert(systemMessage.content.length > 0, 'System prompt should not be empty');
    assert(capturedMessages.length > 1, 'Should include chat messages beyond system prompt');
  });
});

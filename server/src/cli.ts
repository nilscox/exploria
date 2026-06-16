import 'dotenv/config';
import fs from 'node:fs/promises';
import RL from 'node:readline/promises';
import OpenAI from 'openai';

import { Assistant } from './assistant';
import { Session } from './session';
import { createId } from './utils';

async function main() {
  const rl = RL.createInterface(process.stdin, process.stdout);

  rl.addListener('SIGINT', () => process.exit(0));

  const client = new OpenAI({
    baseURL: 'https://api.mammouth.ai/v1',
    apiKey: process.env.MAMMOUTH_API_KEY,
  });

  const session = new Session(createId());
  const assistant = new Assistant(client, 'gpt-4.1-mini');

  const instructions = await fs.readFile('instructions.md').then(String);

  session.addMessage({
    id: createId(),
    date: new Date().toISOString(),
    role: 'system',
    content: instructions,
  });

  assistant.addListener('chunk', (text) => {
    process.stdout.write(text);
  });

  while (true) {
    session.addMessage({
      id: createId(),
      date: new Date().toISOString(),
      role: 'user',
      content: await rl.question('> '),
    });

    await assistant.run(session);

    process.stdout.write('\n');
  }
}

main().catch(console.error);

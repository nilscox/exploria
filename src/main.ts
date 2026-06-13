import 'dotenv/config';
import fs from 'node:fs/promises';
import RL from 'node:readline/promises';

import { runTurn } from './conversation-loop';
import { Message, Plan } from './types';

async function main() {
  const rl = RL.createInterface(process.stdin, process.stdout);

  rl.addListener('SIGINT', () => process.exit(0));

  const instructions = await fs.readFile('instructions.md').then(String);

  let conversation: {
    messages: Message[];
    plan: Plan;
  } = {
    messages: [],
    plan: {
      topics: [],
    },
  };

  const onChunk = (text: string) => {
    process.stdout.write(text);
  };

  const onPlanUpdate = (plan: Plan) => {
    console.log('PLAN UPDATE');
    console.log(plan);
    console.log('END');
  };

  conversation.messages.push({
    role: 'system',
    content: instructions,
  });

  while (true) {
    const userInput = await rl.question('> ');

    conversation.messages.push({
      role: 'user',
      content: userInput,
    });

    conversation = await runTurn(conversation.messages, conversation.plan, onChunk, onPlanUpdate);

    process.stdout.write('\n');
  }
}

main().catch(console.error);

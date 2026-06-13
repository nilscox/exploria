import 'dotenv/config';
import fs from 'node:fs/promises';
import RL from 'node:readline/promises';

import { runTurn } from './conversation-loop';

import type { Plan, Session } from './types';

async function main() {
  const rl = RL.createInterface(process.stdin, process.stdout);

  rl.addListener('SIGINT', () => process.exit(0));

  const instructions = await fs.readFile('instructions.md').then(String);

  let session: Session = {
    messages: [{ role: 'system', content: instructions }],
    plan: { topics: [] },
  };

  const onChunk = (text: string) => {
    process.stdout.write(text);
  };

  const onPlanUpdate = (plan: Plan) => {
    console.log('PLAN UPDATE');
    console.log(plan);
    console.log('END');
  };

  while (true) {
    const userInput = await rl.question('> ');

    session.messages.push({ role: 'user', content: userInput });

    session = await runTurn(session, onChunk, onPlanUpdate);

    process.stdout.write('\n');
  }
}

main().catch(console.error);

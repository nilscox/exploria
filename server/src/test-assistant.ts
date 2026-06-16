import EventEmitter from 'node:events';

import { tools } from './tools';
import { assert } from './utils';

import type { Session } from './session';

export class TestAssistant extends EventEmitter<{ chunk: [text: string] }> {
  async run(session: Session) {
    const lastMessage = session.messages.at(-1);
    assert(lastMessage);

    // oxlint-disable-next-line no-eval typescript/no-implied-eval
    const fn = new Function('session', 'tools', lastMessage.content);

    await fn(session, tools);
  }
}

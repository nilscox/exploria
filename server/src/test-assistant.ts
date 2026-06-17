import { tools } from './tools';
import { assert } from './utils';

import type { Assistant } from './assistant';
import type { Session } from './session';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export class TestAssistant {
  run: Assistant['run'] = async (session: Session, { message, onChunk }) => {
    assert(message);

    session.addMessage('user', message);

    // oxlint-disable-next-line no-eval typescript/no-implied-eval
    const fn = new AsyncFunction('session', 'tools', 'onChunk', message);

    await fn(session, tools, onChunk);
  };
}

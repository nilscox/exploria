import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Assistant } from './assistant';
import { di, StubDateAdapter } from './di';
import { Session } from './session';

void describe('Assistant', () => {
  void it('formats the session info', async () => {
    const stubDate = new StubDateAdapter();
    di.bind('date', stubDate);

    const session = new Session('');

    session.startTimer(60);

    stubDate.advance({ minutes: 5 });

    let result = Assistant.formatSessionInfo(session);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 5 minutes'));
    assert(result.includes('Temps restant : 55 minutes'));

    session.pauseTimer();

    result = Assistant.formatSessionInfo(session);

    assert(result.includes('Chronomètre en pause'));

    stubDate.advance({ minutes: 60 });

    result = Assistant.formatSessionInfo(session);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 65 minutes'));
    assert(result.includes('Temps restant : 0 minutes'));
    assert(result.includes('Temps imparti écoulé, il est nécessaire de conclure'));
  });
});

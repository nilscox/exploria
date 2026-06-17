import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Assistant } from './assistant';
import { di, StubDate, StubGenerator } from './di';
import { Session } from './domain/session';

void describe('Assistant', () => {
  void it('formats the session info', async () => {
    const generator = new StubGenerator();
    di.bind('generator', generator);

    const stubDate = new StubDate();
    di.bind('date', stubDate);

    const session = new Session();

    session.startTimer(60);

    stubDate.advance({ minutes: 5 });

    let result = Assistant.formatSessionInfo(session);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 5 minutes'));
    assert(result.includes('Temps restant : 55 minutes'));

    session.pauseTimer();

    result = Assistant.formatSessionInfo(session);

    assert(result.includes('Chronomètre en pause'));

    session.resumeTimer();
    stubDate.advance({ minutes: 60 });

    result = Assistant.formatSessionInfo(session);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 65 minutes'));
    assert(result.includes('Temps restant : 0 minutes'));
    assert(result.includes('Temps imparti écoulé, il est nécessaire de conclure'));
  });
});

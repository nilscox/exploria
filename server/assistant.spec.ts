import { add } from 'date-fns';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';

import { Assistant } from './assistant';
import { Session } from './session';

void describe('Assistant', () => {
  void it('formats the session info', () => {
    const date = new Date('2000-01-01');
    const getNow = mock.fn(() => date);

    const session = new Session(getNow);

    session.startTimer(60);

    getNow.mock.mockImplementation(() => add(date, { minutes: 5 }));

    let result = Assistant.formatSessionInfo(session, getNow);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 5 minutes'));
    assert(result.includes('Temps restant : 55 minutes'));

    session.pauseTimer();

    result = Assistant.formatSessionInfo(session, getNow);

    assert(result.includes('Chronomètre en pause'));

    getNow.mock.mockImplementation(() => add(date, { minutes: 65 }));

    result = Assistant.formatSessionInfo(session, getNow);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 65 minutes'));
    assert(result.includes('Temps restant : 0 minutes'));
    assert(result.includes('Temps imparti écoulé, il est nécessaire de conclure'));
  });
});

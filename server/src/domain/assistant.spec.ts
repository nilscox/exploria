import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import { StubClock } from '../adapters/clock';
import { StubGenerator } from '../adapters/generator';
import { StubUiNotifier } from '../adapters/logger';
import { Assistant } from './assistant';
import { Session } from './session';

void describe('Assistant', () => {
  let generator: StubGenerator;
  let clock: StubClock;
  let uiNotifier: StubUiNotifier;

  beforeEach(() => {
    generator = new StubGenerator(['id']);
    clock = new StubClock();
    uiNotifier = new StubUiNotifier();
  });

  void it('formats the session info', async () => {
    const session = new Session(generator, clock, uiNotifier);

    session.startTimer(60);

    clock.advance({ minutes: 5 });

    let result = Assistant.formatSessionInfo(clock, session);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 5 minutes'));
    assert(result.includes('Temps restant : 55 minutes'));

    session.pauseTimer();

    result = Assistant.formatSessionInfo(clock, session);

    assert(result.includes('Chronomètre en pause'));

    session.resumeTimer();
    clock.advance({ minutes: 60 });

    result = Assistant.formatSessionInfo(clock, session);

    assert(result.includes('Temps de la session : 60 minutes'));
    assert(result.includes('Temps écoulé : 65 minutes'));
    assert(result.includes('Temps restant : 0 minutes'));
    assert(result.includes('Temps imparti écoulé, il est nécessaire de conclure'));
  });
});

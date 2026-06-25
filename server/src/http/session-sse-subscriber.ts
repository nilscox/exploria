import { toSessionView } from '../domain/projections/session-view';

import type { SessionRepository } from '../database/session-repository';
import type { SessionEvent, SessionUiEvent } from '../domain/session';
import type { UiNotifier } from '../domain/ui-notifier';
import type { EventBus } from '../event-bus';

export class SessionSseSubscriber {
  constructor(
    events: EventBus,
    sessionRepository: SessionRepository,
    uiNotifier: UiNotifier<SessionUiEvent>,
  ) {
    events.subscribe(async (batch) => {
      const sessionEvents = batch.filter((e): e is SessionEvent => e.aggregateType === 'Session');

      if (sessionEvents.length === 0) {
        return;
      }

      const sessionId = sessionEvents[0]!.aggregateId;
      const allEvents = await sessionRepository.findEvents(sessionId);
      const view = toSessionView(sessionId, allEvents);

      uiNotifier.notify(sessionId, { type: 'SessionChanged', sessionId, changes: view });
    });
  }
}

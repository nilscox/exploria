import { dequal } from 'dequal';

import { toSessionView } from '../domain/projections/session-view';

import type { SessionRepository } from '../database/session-repository';
import type { SessionEvent } from '../domain/session';
import type { UiNotifier } from '../domain/ui-notifier';
import type { EventBus } from '../event-bus';
import type { Shared } from '../shared';

export class SessionSseSubscriber {
  constructor(events: EventBus, sessionRepository: SessionRepository, uiNotifier: UiNotifier<Shared.SessionUiEvent>) {
    events.subscribe(async (batch) => {
      const sessionEvents = batch.filter((e): e is SessionEvent => e.aggregateType === 'Session');

      if (sessionEvents.length === 0) {
        return;
      }

      const sessionId = sessionEvents[0]!.aggregateId;
      const allEvents = await sessionRepository.findEvents(sessionId);
      const prevEvents = allEvents.slice(0, allEvents.length - sessionEvents.length);

      const { timeline: prevTimeline, ...prevView } = toSessionView(sessionId, prevEvents);
      const { timeline: newTimeline, ...newView } = toSessionView(sessionId, allEvents);

      for (let i = 0; i < prevTimeline.length; i++) {
        if (!dequal(prevTimeline[i], newTimeline[i])) {
          uiNotifier.notify(sessionId, { type: 'TimelineItemChanged', sessionId, index: i, item: newTimeline[i]! });
        }
      }

      for (let i = prevTimeline.length; i < newTimeline.length; i++) {
        uiNotifier.notify(sessionId, { type: 'TimelineItemAdded', sessionId, item: newTimeline[i]! });
      }

      if (!dequal(prevView, newView)) {
        uiNotifier.notify(sessionId, {
          type: 'SessionChanged',
          sessionId,
          changes: newView,
        });
      }
    });
  }
}

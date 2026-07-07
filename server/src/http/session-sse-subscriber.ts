import { dequal } from 'dequal';

import { toSessionView } from '../domain/projections/session-view.ts';

import type { Dependencies } from '../di.ts';
import type { SessionEvent } from '../domain/session.ts';
import type { UiNotifier } from '../domain/ui-notifier.ts';
import type { Shared } from '../shared.ts';

export class SessionSseSubscriber {
  readonly unsubscribe: () => void;

  constructor({
    events,
    sessionRepository,
    uiNotifier,
  }: Dependencies<'events' | 'sessionRepository'> & { uiNotifier: UiNotifier<Shared.SessionUiEvent> }) {
    this.unsubscribe = events.subscribe(async (batch) => {
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

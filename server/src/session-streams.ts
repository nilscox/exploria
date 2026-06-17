import {
  type GetSessionEvent,
  type ServerSentSessionEvent,
  type SessionEvent,
  sessionEventTypes,
} from '@exploria/shared';

import { di } from './di';
import { MapSet, defined } from './utils';

import type { Session } from './domain/session';
import type { ServerSentEvent } from './sse';

export class SessionStreams {
  private streams = new MapSet<string, ServerSentEvent<ServerSentSessionEvent>>();

  add(sessionId: string, stream: ServerSentEvent<ServerSentSessionEvent>) {
    this.streams.add(sessionId, stream);
  }

  remove(sessionId: string, stream: ServerSentEvent<ServerSentSessionEvent>) {
    this.streams.remove(sessionId, stream);
  }

  bindEvents() {
    const events = di.resolve('events');
    const repository = di.resolve('sessionRepository');

    const handle = <E extends SessionEvent>(handler: (session: Session, event: E) => void) => {
      return async (event: E) => {
        handler(defined(await repository.find(event.entityId)), event);
      };
    };

    const planInitialized = (session: Session) => {
      this.send(session.id, { type: 'session:subjectChanged', subject: session.subject });
      this.send(session.id, { type: 'session:topicsChanged', topics: session.topics });
    };

    const subjectChanged = (session: Session) => {
      this.send(session.id, { type: 'session:subjectChanged', subject: session.subject });
    };

    const topicsChanged = (session: Session) => {
      this.send(session.id, { type: 'session:topicsChanged', topics: session.topics });
    };

    const notesChanged = (session: Session) => {
      this.send(session.id, { type: 'session:notesChanged', notes: session.notes });
    };

    const timerChanged = (session: Session) => {
      this.send(session.id, { type: 'session:timerChanged', timer: session.timer ?? undefined });
    };

    const messageAdded = (session: Session, { message }: GetSessionEvent<'messageAdded'>) => {
      this.send(session.id, { type: 'session:messageAdded', message });
    };

    events.addListener('planInitialized', handle(planInitialized));
    events.addListener('subjectChanged', handle(subjectChanged));
    events.addListener('topicAdded', handle(topicsChanged));
    events.addListener('topicRemoved', handle(topicsChanged));
    events.addListener('topicLabelChanged', handle(topicsChanged));
    events.addListener('topicStatusChanged', handle(topicsChanged));
    events.addListener('noteAdded', handle(notesChanged));
    events.addListener('noteRemoved', handle(notesChanged));
    events.addListener('noteContentChanged', handle(notesChanged));
    events.addListener('timerStarted', handle(timerChanged));
    events.addListener('timerCleared', handle(timerChanged));
    events.addListener('timerPaused', handle(timerChanged));
    events.addListener('timerResumed', handle(timerChanged));
    events.addListener<GetSessionEvent<'messageAdded'>>('messageAdded', handle(messageAdded));

    for (const type of sessionEventTypes) {
      events.addListener<SessionEvent>(type, (event) =>
        this.send(event.entityId, { type: 'session:eventEmitted', event }),
      );
    }
  }

  private send(sessionId: string, event: ServerSentSessionEvent) {
    this.streams.get(sessionId)?.forEach((stream) => stream.send(event));
  }
}

import {
  type GetSessionEvent,
  type ServerSentSessionEvent,
  type SessionEvent,
  sessionEventTypes,
} from '@exploria/shared';

import { MapSet, defined } from './utils';

import type { SessionRepository } from './database/session-repository';
import type { Session } from './domain/session';
import type { Events } from './events';
import type { ServerSentEvent } from './sse';

export class SessionStreams {
  private readonly events: Events;
  private readonly sessionRepository: SessionRepository;

  private streams = new MapSet<string, ServerSentEvent<ServerSentSessionEvent>>();

  constructor(events: Events, sessionRepository: SessionRepository) {
    this.events = events;
    this.sessionRepository = sessionRepository;
  }

  add(sessionId: string, stream: ServerSentEvent<ServerSentSessionEvent>) {
    this.streams.add(sessionId, stream);
  }

  remove(sessionId: string, stream: ServerSentEvent<ServerSentSessionEvent>) {
    this.streams.remove(sessionId, stream);
  }

  bindEvents() {
    const handle = <E extends SessionEvent>(handler: (session: Session, event: E) => void) => {
      return async (event: E) => {
        handler(defined(await this.sessionRepository.find(event.entityId)), event);
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

    this.events.addListener('planInitialized', handle(planInitialized));
    this.events.addListener('subjectChanged', handle(subjectChanged));
    this.events.addListener('topicAdded', handle(topicsChanged));
    this.events.addListener('topicRemoved', handle(topicsChanged));
    this.events.addListener('topicLabelChanged', handle(topicsChanged));
    this.events.addListener('topicStatusChanged', handle(topicsChanged));
    this.events.addListener('noteAdded', handle(notesChanged));
    this.events.addListener('noteRemoved', handle(notesChanged));
    this.events.addListener('noteContentChanged', handle(notesChanged));
    this.events.addListener('timerStarted', handle(timerChanged));
    this.events.addListener('timerCleared', handle(timerChanged));
    this.events.addListener('timerPaused', handle(timerChanged));
    this.events.addListener('timerResumed', handle(timerChanged));
    this.events.addListener<GetSessionEvent<'messageAdded'>>('messageAdded', handle(messageAdded));

    for (const type of sessionEventTypes) {
      this.events.addListener<SessionEvent>(type, (event) =>
        this.send(event.entityId, { type: 'session:eventEmitted', event }),
      );
    }
  }

  private send(sessionId: string, event: ServerSentSessionEvent) {
    this.streams.get(sessionId)?.forEach((stream) => stream.send(event));
  }
}

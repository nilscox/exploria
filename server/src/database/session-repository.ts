import { eq } from 'drizzle-orm';

import { Session, type SessionEvent } from '../domain/session';
import { domainEvents, sessions } from './schema';

import type { Clock } from '../adapters/clock';
import type { Generator } from '../adapters/generator';
import type { UiNotifier } from '../domain/ui-notifier';
import type { Database } from './database';
import type { DomainEventSelect } from './model';

export class SessionRepository {
  private generator: Generator;
  private clock: Clock;
  private uiNotifier: UiNotifier;
  private db: Database;

  constructor(generator: Generator, clock: Clock, uiNotifier: UiNotifier, database: Database) {
    this.clock = clock;
    this.uiNotifier = uiNotifier;
    this.generator = generator;
    this.db = database;
  }

  async insert(session: Session) {
    await this.db.insert(sessions).values({
      id: session.id,
      model: session.model,
      subject: session.subject,
    });
  }

  async save(session: Session) {
    const newEvents = session.peekDomainEvents();

    if (newEvents.length === 0) {
      return;
    }

    await this.db
      .update(sessions)
      .set({ model: session.model, subject: session.subject })
      .where(eq(sessions.id, session.id));

    await Promise.all(
      newEvents.map(async (event) => {
        const { aggregateId, aggregateType, occurredAt, type, ...payload } = event;

        await this.db.insert(domainEvents).values({
          id: this.generator.id(),
          aggregateId,
          aggregateType,
          occurredAt,
          type,
          payload,
        });
      }),
    );
  }

  async find(id: string) {
    const session = await this.db.query.sessions.findFirst({ where: { id } });

    if (!session) {
      return null;
    }

    const dbEvents = await this.db.query.domainEvents.findMany({
      where: { aggregateType: 'Session', aggregateId: id },
      orderBy: { occurredAt: 'asc' },
    });

    return Session.replay(this.generator, this.clock, this.uiNotifier, id, dbEvents.map(SessionRepository.mapEvent));
  }

  async findMany({ offset, limit }: { offset: number; limit: number }) {
    return this.db.query.sessions.findMany({ offset, limit });
  }

  async count() {
    return this.db.$count(sessions);
  }

  async delete(id: string) {
    await this.db.delete(domainEvents).where(eq(domainEvents.aggregateId, id));
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  async findEvents(sessionId: string) {
    return this.db.query.domainEvents.findMany({
      where: { aggregateType: 'Session', aggregateId: sessionId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  private static mapEvent(this: void, event: DomainEventSelect): SessionEvent {
    return {
      aggregateType: event.aggregateType as 'Session',
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt,
      type: event.type as SessionEvent['type'],
      ...event.payload,
    } as SessionEvent;
  }
}

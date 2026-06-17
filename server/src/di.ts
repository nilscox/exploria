import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';
import { add, type Duration } from 'date-fns';
import { customAlphabet } from 'nanoid';
import OpenAI from 'openai';

import { Assistant } from './assistant';
import { drizzleDatabase } from './database';
import { SessionRepository } from './database/session-repository';
import { Events } from './events';
import { SessionController } from './session-controller';
import { SessionStreams } from './session-streams';

export interface Generator {
  id(): string;
}

export class NanoIdGenerator implements Generator {
  id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);
}

export class StubGenerator implements Generator {
  public nextId = '';

  id(): string {
    return this.nextId;
  }
}

export interface Clock {
  now(): Date;
}

export class NativeDateClock implements Clock {
  now() {
    return new Date();
  }
}

export class StubClock implements Clock {
  date = new Date(0);

  now() {
    return this.date;
  }

  advance(duration: Duration) {
    this.date = add(this.date, duration);
  }
}

function openAiClientFactory() {
  return new OpenAI({
    baseURL: process.env.OPEN_AI_BASE_URL,
    apiKey: process.env.OPEN_AI_API_KEY,
  });
}

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
}).register({
  generator: asClass(NanoIdGenerator),
  clock: asClass(NativeDateClock),
  events: asClass(Events),
  database: asValue(drizzleDatabase),
  sessionController: asClass(SessionController),
  sessionStreams: asClass(SessionStreams),
  sessionRepository: asClass(SessionRepository),
  openAiClient: asFunction(openAiClientFactory),
  assistant: asClass(Assistant),
});

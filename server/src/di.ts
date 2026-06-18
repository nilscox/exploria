import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';
import { add, type Duration } from 'date-fns';
import { customAlphabet } from 'nanoid';
import OpenAI from 'openai';

import { Assistant } from './assistant';
import { drizzleDatabase } from './database';
import { SessionRepository } from './database/session-repository';
import { EventBus } from './event-bus';
import { SessionController } from './http/session-controller';
import { SseUiNotifier } from './http/sse';
import { TestAssistant } from './test-assistant';

import type { UiNotifier } from './domain/ui-notifier';

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

export interface Logger {
  log(...args: unknown[]): void;
}

export class StubUiNotifier {
  notify() {}
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
  generator: asClass<Generator>(NanoIdGenerator),
  clock: asClass<Clock>(NativeDateClock),
  logger: asValue<Logger>(console),
  events: asClass(EventBus),
  uiNotifier: asClass<UiNotifier>(SseUiNotifier).singleton(),
  database: asValue(drizzleDatabase),
  sessionController: asClass(SessionController),
  sessionRepository: asClass(SessionRepository),
  openAiClient: asFunction(openAiClientFactory),
  assistant: process.env.TEST === 'true' ? asClass(TestAssistant) : asClass(Assistant),
});

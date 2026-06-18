import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';
import { add, type Duration } from 'date-fns';
import { customAlphabet } from 'nanoid';
import OpenAI from 'openai';

import { Assistant } from './assistant';
import { Database } from './database/database';
import { SessionRepository } from './database/session-repository';
import { EventBus } from './event-bus';
import { SessionController } from './http/session-controller';
import { SseUiNotifier } from './http/sse';
import { TestAssistant } from './test-assistant';

import type { UiNotifier } from './domain/ui-notifier';

export interface Config {
  server: {
    host: string;
    port: number;
  };

  openAi: {
    baseUrl?: string;
    apiKey: string;
  };

  database: {
    url: string;
    debug: boolean;
  };

  assistant: 'test' | undefined;
  defaultModel: string;
}

export class EnvConfig implements Config {
  private env(name: string, defaultValue?: string): string;
  private env<T>(name: string, defaultValue?: string, parse?: (value: string) => T): T;
  private env<T>(name: string, defaultValue?: string, parse?: (value: string) => T): string | T {
    const value = process.env[name] ?? defaultValue;

    if (value === undefined) {
      throw new Error(`Missing environment variable ${name}`);
    }

    return parse ? parse(value) : value;
  }

  get server() {
    return {
      host: this.env('HOST', 'localhost'),
      port: this.env('PORT', '3000', Number.parseInt),
    };
  }

  get openAi() {
    return {
      baseUrl: this.env('OPEN_AI_BASE_URL'),
      apiKey: this.env('OPEN_AI_API_KEY'),
    };
  }

  get database() {
    return {
      url: this.env('DATABASE_URL'),
      debug: this.env('DATABASE_URL', 'false', (value) => value === 'true'),
    };
  }

  get defaultModel() {
    return this.env('DEFAULT_MODEL');
  }

  get assistant() {
    return this.env('ASSISTANT', '', (value) => (value === 'test' ? value : undefined));
  }
}

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

function openAiClientFactory(config: Config) {
  return new OpenAI({
    baseURL: config.openAi.baseUrl,
    apiKey: config.openAi.apiKey,
  });
}

function assistantFactory(config: Config, clock: Clock, uiNotifier: UiNotifier, openAiClient: OpenAI) {
  if (config.assistant === 'test') {
    return new TestAssistant(uiNotifier);
  }

  return new Assistant(clock, uiNotifier, openAiClient);
}

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
}).register({
  config: asClass<Config>(EnvConfig),
  generator: asClass<Generator>(NanoIdGenerator),
  clock: asClass<Clock>(NativeDateClock),
  logger: asValue<Logger>(console),
  events: asClass(EventBus),
  uiNotifier: asClass<UiNotifier>(SseUiNotifier).singleton(),
  database: asClass(Database),
  sessionController: asClass(SessionController),
  sessionRepository: asClass(SessionRepository),
  openAiClient: asFunction(openAiClientFactory),
  assistant: asFunction(assistantFactory),
});

console.log(container.resolve('assistant'));

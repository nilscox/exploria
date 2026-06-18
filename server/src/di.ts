import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';
import OpenAI from 'openai';

import { NativeDateClock } from './adapters/clock';
import { EnvConfig, type Config } from './adapters/config';
import { NanoIdGenerator, type Generator } from './adapters/generator';
import { createDatabase, SessionRepository } from './database';
import { Assistant } from './domain/assistant';
import { TestAssistant } from './domain/test-assistant';
import { EventBus } from './event-bus';
import { SessionController } from './http/session-controller';
import { SseUiNotifier } from './http/sse';

import type { Clock } from './adapters/clock';
import type { Logger } from './adapters/logger';
import type { UiNotifier } from './domain/ui-notifier';

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
  database: asFunction(createDatabase),
  sessionController: asClass(SessionController),
  sessionRepository: asClass(SessionRepository),
  openAiClient: asFunction(openAiClientFactory),
  assistant: asFunction(assistantFactory),
});

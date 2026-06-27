import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';

import { OpenAiClient, type AiClient } from './adapters/ai-client';
import { NativeDateClock } from './adapters/clock';
import { EnvConfig, type Config } from './adapters/config';
import { NanoIdGenerator, type Generator } from './adapters/generator';
import { MustacheI18n, type I18n } from './adapters/i18n';
import { TavilySearchClient, type SearchClient } from './adapters/search-client';
import { createDatabase, SessionRepository } from './database';
import { Assistant } from './domain/assistant';
import { createTools, type AssistantTools } from './domain/assistant-tools';
import { EvalAssistant } from './domain/eval-assistant';
import { SummaryGenerator } from './domain/summary-generator';
import { TestAssistant } from './domain/test-assistant';
import { EventBus } from './event-bus';
import { Server } from './http/server';
import { SessionController } from './http/session-controller';
import { SseUiNotifier } from './http/sse';

import type { Clock } from './adapters/clock';
import type { Logger } from './adapters/logger';
import type { UiNotifier } from './domain/ui-notifier';

function searchClientFactory(config: Config): SearchClient | null {
  return config.searchApiKey ? new TavilySearchClient(config.searchApiKey) : null;
}

function assistantFactory(
  config: Config,
  clock: Clock,
  uiNotifier: UiNotifier,
  aiClient: AiClient,
  i18n: I18n,
  assistantTools: AssistantTools,
) {
  if (config.assistant === 'test') {
    return new TestAssistant(uiNotifier);
  }

  if (config.assistant === 'eval') {
    return new EvalAssistant(uiNotifier, assistantTools);
  }

  return new Assistant(clock, uiNotifier, aiClient, i18n, assistantTools);
}

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
}).register({
  config: asClass<Config>(EnvConfig),
  generator: asClass<Generator>(NanoIdGenerator),
  clock: asClass<Clock>(NativeDateClock).singleton(),
  logger: asValue<Logger>(console),
  events: asClass(EventBus).singleton(),
  uiNotifier: asClass<UiNotifier>(SseUiNotifier).singleton(),
  database: asFunction(createDatabase),
  i18n: asClass<I18n>(MustacheI18n).singleton(),
  sessionController: asClass(SessionController),
  sessionRepository: asClass(SessionRepository),
  aiClient: asClass<AiClient>(OpenAiClient),
  searchClient: asFunction(searchClientFactory),
  assistantTools: asFunction(createTools),
  assistant: asFunction(assistantFactory),
  summaryGenerator: asClass(SummaryGenerator),
  server: asClass(Server),
});

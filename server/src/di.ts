import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';

import { OpenAiClient, type AiClient } from './adapters/ai-client.ts';
import { NativeDateClock } from './adapters/clock.ts';
import { EnvConfig, type Config } from './adapters/config.ts';
import { NanoIdGenerator, type Generator } from './adapters/generator.ts';
import { MustacheI18n, type I18n } from './adapters/i18n.ts';
import { TavilySearchClient, type SearchClient } from './adapters/search-client.ts';
import { createDatabase, SessionRepository, UserRepository } from './database/index.ts';
import { createTools, type AssistantTools } from './domain/assistant-tools.ts';
import { Assistant, type IAssistant } from './domain/assistant.ts';
import { EvalAssistant } from './domain/eval-assistant.ts';
import { SummaryGenerator } from './domain/summary-generator.ts';
import { TestAssistant } from './domain/test-assistant.ts';
import { EventBus } from './event-bus.ts';
import { AuthController } from './http/auth-controller.ts';
import { Server } from './http/server.ts';
import { SessionController } from './http/session-controller.ts';
import { SseUiNotifier } from './http/sse.ts';

import type { Clock } from './adapters/clock.ts';
import type { Logger } from './adapters/logger.ts';
import type { UiNotifier } from './domain/ui-notifier.ts';

function searchClientFactory(config: Config): SearchClient | null {
  return config.tavily.apiKey ? new TavilySearchClient(config.tavily.apiKey) : null;
}

function assistantFactory(
  config: Config,
  uiNotifier: UiNotifier,
  aiClient: AiClient,
  i18n: I18n,
  summaryGenerator: SummaryGenerator,
  assistantTools: AssistantTools,
): IAssistant {
  if (config.assistant === 'test') {
    return new TestAssistant(uiNotifier);
  }

  if (config.assistant === 'eval') {
    return new EvalAssistant(uiNotifier, assistantTools);
  }

  return new Assistant(uiNotifier, aiClient, i18n, summaryGenerator, assistantTools);
}

export const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
  strict: true,
}).register({
  config: asClass<Config>(EnvConfig).singleton(),
  generator: asClass<Generator>(NanoIdGenerator),
  clock: asClass<Clock>(NativeDateClock).singleton(),
  logger: asValue<Logger>(console),
  events: asClass(EventBus).singleton(),
  uiNotifier: asClass<UiNotifier>(SseUiNotifier).singleton(),
  database: asFunction(createDatabase),
  i18n: asClass<I18n>(MustacheI18n).singleton(),
  userRepository: asClass(UserRepository),
  authController: asClass(AuthController),
  sessionController: asClass(SessionController),
  sessionRepository: asClass(SessionRepository),
  aiClient: asClass<AiClient>(OpenAiClient),
  searchClient: asFunction(searchClientFactory),
  assistantTools: asFunction(createTools),
  assistant: asFunction<IAssistant>(assistantFactory),
  summaryGenerator: asClass(SummaryGenerator),
  server: asClass(Server),
});

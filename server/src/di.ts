import { asClass, asFunction, asValue, createContainer, InjectionMode } from 'awilix';

import { OpenAiClient, type AiClient } from './adapters/ai-client.ts';
import { NativeDateClock } from './adapters/clock.ts';
import { EnvConfig, type Config } from './adapters/config.ts';
import { NanoIdGenerator, type Generator } from './adapters/generator.ts';
import { MustacheI18n, type I18n } from './adapters/i18n.ts';
import { TavilySearchClient, type SearchClient } from './adapters/search-client.ts';
import { createDatabase, SessionRepository, UserRepository } from './database/index.ts';
import {
  createCuratorTools,
  createFacilitatorTools,
  type CuratorTools,
  type FacilitatorTools,
} from './domain/assistant-tools.ts';
import { Assistant, type IAssistant } from './domain/assistant.ts';
import { Curator } from './domain/curator.ts';
import { DemoGenerator } from './domain/demo-generator.ts';
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
import type { Database } from './database/database.ts';
import type { UiNotifier } from './domain/ui-notifier.ts';

type Cradle = {
  config: Config;
  generator: Generator;
  clock: Clock;
  logger: Logger;
  events: EventBus;
  uiNotifier: UiNotifier;
  database: Database;
  i18n: I18n;
  userRepository: UserRepository;
  authController: AuthController;
  sessionController: SessionController;
  sessionRepository: SessionRepository;
  aiClient: AiClient;
  searchClient: SearchClient | null;
  facilitatorTools: FacilitatorTools;
  curatorTools: CuratorTools;
  curator: Curator;
  assistant: IAssistant;
  summaryGenerator: SummaryGenerator;
  demoGenerator: DemoGenerator;
  server: Server;
};

export type Dependencies<Keys extends keyof Cradle> = Pick<Cradle, Keys>;

function searchClientFactory({ config }: Dependencies<'config'>): SearchClient | null {
  return config.tavily.apiKey ? new TavilySearchClient(config.tavily.apiKey) : null;
}

function assistantFactory(deps: Dependencies<keyof Cradle>): IAssistant {
  const config = deps.config;

  if (config.assistant === 'test') {
    return new TestAssistant(deps);
  }

  if (config.assistant === 'eval') {
    return new EvalAssistant(deps);
  }

  return new Assistant(deps);
}

export const container = createContainer<Cradle>({
  injectionMode: InjectionMode.PROXY,
  strict: true,
}).register({
  config: asClass(EnvConfig).singleton(),
  generator: asClass(NanoIdGenerator),
  clock: asClass(NativeDateClock).singleton(),
  logger: asValue(console),
  events: asClass(EventBus).singleton(),
  uiNotifier: asClass(SseUiNotifier).singleton(),
  database: asFunction(createDatabase),
  i18n: asClass(MustacheI18n).singleton(),
  userRepository: asClass(UserRepository),
  authController: asClass(AuthController),
  sessionController: asClass(SessionController),
  sessionRepository: asClass(SessionRepository),
  aiClient: asClass(OpenAiClient),
  searchClient: asFunction(searchClientFactory),
  facilitatorTools: asFunction(createFacilitatorTools),
  curatorTools: asFunction(createCuratorTools),
  curator: asClass(Curator),
  assistant: asFunction(assistantFactory),
  summaryGenerator: asClass(SummaryGenerator),
  demoGenerator: asClass(DemoGenerator),
  server: asClass(Server),
});

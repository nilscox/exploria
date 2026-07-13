import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import type { Server as HttpServer } from 'node:http';
import { promisify } from 'node:util';
import z from 'zod';

import { provideAiCredentials } from '../adapters/ai-client-context.ts';
import { SseUiNotifier } from './sse.ts';
import { provideUser } from './user-context.ts';

import type { Config } from '../adapters/config.ts';
import type { Logger } from '../adapters/logger.ts';
import type { UserRepository } from '../database/user-repository.ts';
import type { Dependencies } from '../di.ts';
import type { UiNotifier } from '../domain/ui-notifier.ts';

export class Server {
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly uiNotifier: UiNotifier;

  private app = express();
  private server?: HttpServer;

  constructor({
    config,
    logger,
    uiNotifier,
    userRepository,
    authController,
    sessionController,
  }: Dependencies<'config' | 'logger' | 'uiNotifier' | 'userRepository' | 'authController' | 'sessionController'>) {
    this.config = config;
    this.logger = logger;
    this.uiNotifier = uiNotifier;

    this.logger.log(`Registering API routes`);

    const api = express.Router();

    this.app.use(api);

    if (config.env === 'development') {
      api.use(cors({ origin: true, credentials: true, exposedHeaders: ['X-Page', 'X-Total-Pages'] }));
    }

    api.use(express.json());
    api.use(cookieParser(config.auth.cookieSecret));
    api.use(this.authMiddleware(userRepository));
    api.use(this.aiCredentialsMiddleware());
    api.use('/health', (_req, res) => res.status(204).end());
    api.use('/auth', authController.router);
    api.use('/session', sessionController.router);
    api.use((_req, res) => res.status(404).end());
    api.use(this.errorHandler);
  }

  private authMiddleware(userRepository: UserRepository): RequestHandler {
    return async (req, res, next) => {
      const uid = req.signedCookies?.['uid'];

      if (uid) {
        const user = await userRepository.findById(uid);

        if (user) {
          return provideUser(user, next);
        } else {
          res.clearCookie('uid');
        }
      }

      next();
    };
  }

  private aiCredentialsMiddleware(): RequestHandler {
    return (req, _res, next) => {
      const { ai_base_url: baseUrl, ai_api_key: apiKey } = req.cookies ?? {};

      if (baseUrl && apiKey) {
        provideAiCredentials({ baseUrl, apiKey }, next);
      } else {
        next();
      }
    };
  }

  async start() {
    const { host, port } = this.config.server;

    this.logger.log('Starting server...');
    await this.listen(host, port);
    this.logger.log(`Server running on http://${host}:${port}`);
  }

  async stop() {
    this.logger.log('Closing server...');

    if (this.uiNotifier instanceof SseUiNotifier) {
      await this.uiNotifier.endAll();
    }

    await promisify<void>((cb) => this.server?.close(cb))();
    this.logger.log('Server closed');
  }

  private async listen(host: string, port: number) {
    return new Promise<void>((resolve, reject) => {
      this.server = this.app.listen(port, host, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json(z.formatError(err));
    }

    console.error(err);
    res.status(500);

    if (err instanceof Error) {
      res.send(err.message);
    } else {
      res.end();
    }
  };
}

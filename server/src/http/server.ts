import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import type { Server as HttpServer } from 'node:http';
import { promisify } from 'node:util';
import z from 'zod';

import { SseUiNotifier } from './sse';

import type { Config } from '../adapters/config';
import type { Logger } from '../adapters/logger';
import type { UiNotifier } from '../domain/ui-notifier';
import type { SessionController } from './session-controller';

export class Server {
  private readonly config: Config;
  private readonly logger: Logger;
  private readonly uiNotifier: UiNotifier;

  private app = express();
  private server?: HttpServer;

  constructor(config: Config, logger: Logger, uiNotifier: UiNotifier, sessionController: SessionController) {
    this.config = config;
    this.logger = logger;
    this.uiNotifier = uiNotifier;

    this.logger.log(`Registering API routes`);

    const api = express.Router();

    this.app.use(api);

    api.use(cors({ exposedHeaders: ['X-Page', 'X-Total-Pages'] }));
    api.use(express.json());
    api.use('/session', sessionController.router);
    api.use((req, res) => res.status(404).end());
    api.use(this.errorHandler);
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

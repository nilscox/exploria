import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import fs from 'node:fs';
import type { Server as HttpServer } from 'node:http';
import path from 'node:path';
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

    const api = express.Router();

    if (config.server.basePath) {
      this.logger.log(`Registering API routes at ${config.server.basePath}`);
      this.app.use(config.server.basePath, api);
    } else {
      this.logger.log(`Registering API routes`);
      this.app.use(api);
    }

    api.use(cors({ exposedHeaders: ['X-Page', 'X-Total-Pages'] }));
    api.use(express.json());
    api.use('/session', sessionController.router);
    api.use((req, res) => res.status(404).end());
    api.use(this.errorHandler);

    if (config.server.publicDir) {
      this.logger.log(`Serving static files from ${config.server.publicDir}`);
      this.app.use(express.static(config.server.publicDir));

      const index = fs.readFileSync(path.join(config.server.publicDir, 'index.html'));
      this.app.use((req, res) => res.type('html').send(index));
    }
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

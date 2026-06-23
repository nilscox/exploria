import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import type { Server as HttpServer } from 'node:http';
import { promisify } from 'node:util';
import z from 'zod';

import type { Config } from '../adapters/config';
import type { Logger } from '../adapters/logger';
import type { SessionController } from './session-controller';

export class Server {
  private readonly config: Config;
  private readonly logger: Logger;

  private app = express();
  private server?: HttpServer;

  constructor(config: Config, logger: Logger, sessionController: SessionController) {
    this.config = config;
    this.logger = logger;

    this.app.use(cors({ exposedHeaders: ['X-Page', 'X-Total-Pages'] }));
    this.app.use(express.json());
    this.app.use('/session', sessionController.router);
    this.app.use((req, res) => res.status(404).end());
    this.app.use(this.errorHandler);
  }

  async start() {
    const { host, port } = this.config.server;

    await this.listen(host, port);
    this.logger.log(`Server running on http://${host}:${port}`);
  }

  async stop() {
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

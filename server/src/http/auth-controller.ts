import express from 'express';
import z from 'zod';

import { getUser } from './user-context.ts';

import type { Config } from '../adapters/config.ts';
import type { UserRepository } from '../database/user-repository.ts';
import type { Dependencies } from '../di.ts';
import type { User } from '../domain/user.ts';
import type { Shared } from '../shared.ts';

export class AuthController {
  private readonly config: Config;
  private readonly userRepository: UserRepository;

  public router = express.Router();

  constructor({ config, userRepository }: Dependencies<'config' | 'userRepository'>) {
    this.config = config;
    this.userRepository = userRepository;

    this.router.post('/login', async (req, res) => {
      const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
      const user = await this.login(token);

      if (!user) {
        res.status(401).end();
        return;
      }

      res.cookie('uid', user.id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.config.env === 'production',
        signed: true,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });

      res.json(this.toSharedUser(user));
    });

    this.router.post('/logout', (req, res) => {
      res.clearCookie('uid');
      res.status(204).end();
    });

    this.router.get('/me', (req, res) => {
      const user = getUser();

      if (!user) {
        res.status(404).end();
        return;
      }

      res.json(this.toSharedUser(user));
    });
  }

  private async login(token: string): Promise<User | null> {
    return this.userRepository.findByLoginToken(token);
  }

  private toSharedUser(user: User): Shared.User {
    return {
      id: user.id,
      name: user.name,
    };
  }
}

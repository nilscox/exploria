import type { User } from '../domain/user.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

import type { User } from '../domain/user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

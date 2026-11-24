import type { User } from '../auth/user.js';

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth for signed-in requests.
      user?: User;
    }
  }
}

export {};

import type { CookieOptions, RequestHandler } from 'express';
import { HttpError } from '../middleware/http-error.js';
import { SESSION_COOKIE } from './session-cookie.js';
import type { SessionsRepo } from './sessions.repo.js';

export function requireAuth(sessions: SessionsRepo, cookieOpts: CookieOptions): RequestHandler {
  return (req, res, next) => {
    const token: string | undefined = req.cookies?.[SESSION_COOKIE];
    const user = sessions.findUser(token);
    if (!user) {
      if (token) res.clearCookie(SESSION_COOKIE, cookieOpts); // stale or forged: drop it
      throw new HttpError(401, 'Sign in to continue');
    }
    req.user = user;
    res.set('Cache-Control', 'private, no-store');
    next();
  };
}

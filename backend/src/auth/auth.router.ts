import { Router, type CookieOptions, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { HttpError } from '../middleware/http-error.js';
import { validateBody } from '../middleware/validate.js';
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from './auth.schema.js';
import { dummyHash, hashPassword, verifyPassword } from './password.js';
import { SESSION_COOKIE } from './session-cookie.js';
import type { SessionsRepo } from './sessions.repo.js';
import { isUniqueViolation, type UsersRepo } from './users.repo.js';

export interface AuthRateLimits {
  windowMs: number;
  signInPerEmail: number;
  signInPerIp: number;
  signUpPerIp: number;
  signUpWindowMs: number;
}

export const defaultRateLimits: AuthRateLimits = {
  windowMs: 15 * 60 * 1000,
  signInPerEmail: 20,
  signInPerIp: 50,
  signUpPerIp: 5,
  signUpWindowMs: 60 * 60 * 1000,
};

interface AuthRouterDeps {
  users: UsersRepo;
  sessions: SessionsRepo;
  cookieOpts: CookieOptions;
  sessionTtlMs: number;
  allowSignup: boolean;
  limits: AuthRateLimits;
}

const tooMany = () => {
  throw new HttpError(429, 'Too many attempts. Try again in a few minutes.');
};

export function authRouter({ users, sessions, cookieOpts, sessionTtlMs, allowSignup, limits }: AuthRouterDeps) {
  const router = Router();

  // Every auth response describes the signed-in user (or its absence); never cache it.
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });

  // Created per app, so each test app has its own counters. Failed attempts only (status >= 400).
  // Per email: one account can't be guessed from many IPs. Per IP (default key, IPv6 grouped by /56):
  // one client can't spray many emails. Runs before validation, so the email is read defensively.
  const signInPerEmail = rateLimit({
    windowMs: limits.windowMs,
    limit: limits.signInPerEmail,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `email:${String(req.body?.email ?? '').trim().toLowerCase()}`,
    handler: tooMany,
  });
  const signInPerIp = rateLimit({
    windowMs: limits.windowMs,
    limit: limits.signInPerIp,
    skipSuccessfulRequests: true,
    handler: tooMany,
  });
  const signUpPerIp = rateLimit({ windowMs: limits.signUpWindowMs, limit: limits.signUpPerIp, handler: tooMany });

  // Always a fresh session: any session the browser already holds is revoked first, so a planted cookie
  // can't be carried into the signed-in state.
  function startSession(req: Request, res: Response, userId: number) {
    sessions.remove(req.cookies?.[SESSION_COOKIE]);
    res.cookie(SESSION_COOKIE, sessions.create(userId, sessionTtlMs), cookieOpts);
  }

  router.get('/me', (req, res) => {
    const user = sessions.findUser(req.cookies?.[SESSION_COOKIE]) ?? null;
    res.json({ user, signupEnabled: allowSignup });
  });

  router.post(
    '/sign-up',
    (_req, _res, next) => {
      if (!allowSignup) throw new HttpError(404, 'New accounts are turned off on this server.');
      next();
    },
    signUpPerIp,
    validateBody(signUpSchema),
    async (req, res) => {
      const { email, name, password } = req.body as SignUpInput;
      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = users.create({ email, name, passwordHash });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        throw new HttpError(409, 'An account with this email already exists', [
          { field: 'email', message: 'An account with this email already exists' },
        ]);
      }
      startSession(req, res, user.id);
      res.status(201).json({ user });
    },
  );

  router.post('/sign-in', signInPerIp, signInPerEmail, validateBody(signInSchema), async (req, res) => {
    const { email, password } = req.body as SignInInput;
    const found = users.findByEmail(email);
    // Unknown emails still pay for a full hash check, so both failures take the same time.
    const valid = await verifyPassword(password, found?.passwordHash ?? (await dummyHash()));
    if (!found || !valid) throw new HttpError(401, 'Email or password is incorrect');

    startSession(req, res, found.user.id);
    sessions.removeExpired();
    res.json({ user: found.user });
  });

  router.post('/sign-out', (req, res) => {
    sessions.remove(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, cookieOpts);
    res.status(204).end();
  });

  return router;
}

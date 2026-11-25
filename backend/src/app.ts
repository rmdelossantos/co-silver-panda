import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { authRouter, defaultRateLimits, type AuthRateLimits } from './auth/auth.router.js';
import { requireAuth } from './auth/require-auth.js';
import { cookieOptions } from './auth/session-cookie.js';
import { createSessionsRepo } from './auth/sessions.repo.js';
import { createUsersRepo } from './auth/users.repo.js';
import type { Db } from './db/client.js';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { createProductsRepo } from './products/products.repo.js';
import { productsRouter } from './products/products.router.js';

interface AuthOptions {
  allowSignup?: boolean;
  cookieSecure?: boolean;
  sessionTtlMs?: number;
  rateLimit?: Partial<AuthRateLimits>;
}

interface AppOptions {
  staticDir?: string;
  // Overrides for tests; production reads these from env.
  auth?: AuthOptions;
}

// Kept separate from server.ts so tests can import the app without binding a port.
export function createApp(db: Db, { staticDir = env.STATIC_DIR, auth = {} }: AppOptions = {}) {
  const sessionTtlMs = auth.sessionTtlMs ?? env.SESSION_TTL_HOURS * 60 * 60 * 1000;
  const cookieOpts = cookieOptions({ secure: auth.cookieSecure ?? env.COOKIE_SECURE, maxAgeMs: sessionTtlMs });
  const users = createUsersRepo(db);
  const sessions = createSessionsRepo(db);

  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(
    '/api/auth',
    authRouter({
      users,
      sessions,
      cookieOpts,
      sessionTtlMs,
      allowSignup: auth.allowSignup ?? env.ALLOW_SIGNUP,
      limits: { ...defaultRateLimits, ...auth.rateLimit },
    }),
  );
  app.use('/api/products', requireAuth(sessions, cookieOpts), productsRouter(createProductsRepo(db)));

  app.use('/api', notFound);

  // Single-origin deploys: serve the built UI, and fall back to index.html for client-side URLs.
  if (staticDir) {
    app.use(express.static(staticDir, { index: 'index.html', maxAge: '1h' }));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(path.resolve(staticDir), 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

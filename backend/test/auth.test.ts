import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { requireAuth } from '../src/auth/require-auth.js';
import { cookieOptions } from '../src/auth/session-cookie.js';
import { createSessionsRepo } from '../src/auth/sessions.repo.js';
import { openDb } from '../src/db/client.js';
import { envInternals } from '../src/env.js';
import { errorHandler } from '../src/middleware/error-handler.js';

const account = { email: 'Sam@Shop.Example', name: 'Sam', password: 'correct horse battery' };

type AuthOptions = NonNullable<NonNullable<Parameters<typeof createApp>[1]>['auth']>;

function makeApp(auth: AuthOptions = {}) {
  const db = openDb(':memory:');
  return { db, app: createApp(db, { auth: { cookieSecure: true, ...auth } }) };
}

const sessionCookie = (res: request.Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('sid='));

describe('sign-up', () => {
  it('creates the account, signs in, and sets a hardened session cookie', async () => {
    const { app } = makeApp();

    const res = await request(app).post('/api/auth/sign-up').send(account);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user: { id: expect.any(Number), email: 'sam@shop.example', name: 'Sam', createdAt: expect.any(String) } });
    const cookie = sessionCookie(res)!;
    expect(cookie).toMatch(/^sid=[\w-]{43};/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api(;|$)/);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/Max-Age=604800/);
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('omits Secure when configured for plain HTTP', async () => {
    const { app } = makeApp({ cookieSecure: false });

    const res = await request(app).post('/api/auth/sign-up').send(account);

    expect(sessionCookie(res)).not.toMatch(/Secure/i);
  });

  it('rejects a taken email with 409 on the email field, regardless of case', async () => {
    const { app } = makeApp();
    await request(app).post('/api/auth/sign-up').send(account);

    const res = await request(app).post('/api/auth/sign-up').send({ ...account, email: 'SAM@shop.example' });

    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual([{ field: 'email', message: 'An account with this email already exists' }]);
  });

  it.each([
    ['short password', { ...account, password: 'short' }, 'password'],
    ['invalid email', { ...account, email: 'not-an-email' }, 'email'],
    ['blank name', { ...account, name: '  ' }, 'name'],
  ])('validates: %s', async (_label, body, field) => {
    const { app } = makeApp();

    const res = await request(app).post('/api/auth/sign-up').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ field }));
  });

  it('accepts an email with surrounding spaces', async () => {
    const { app } = makeApp();

    const res = await request(app).post('/api/auth/sign-up').send({ ...account, email: '  sam@shop.example  ' });

    expect(res.status).toBe(201);
  });

  it('returns 404 when sign-up is turned off', async () => {
    const { app } = makeApp({ allowSignup: false });

    const res = await request(app).post('/api/auth/sign-up').send(account);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('New accounts are turned off on this server.');
  });
});

describe('sign-in, current user, and sign-out', () => {
  it('signs in, reports the user, and revokes the session on sign-out', async () => {
    // Plain-HTTP cookie so supertest's jar sends it back (a Secure cookie is correctly withheld over http).
    const { app } = makeApp({ cookieSecure: false });
    await request(app).post('/api/auth/sign-up').send(account);
    const agent = request.agent(app);

    const signIn = await agent.post('/api/auth/sign-in').send({ email: 'sam@shop.example', password: account.password });
    expect(signIn.status).toBe(200);
    expect(signIn.body.user.email).toBe('sam@shop.example');
    const cookie = sessionCookie(signIn)!;

    expect((await agent.get('/api/auth/me')).body).toEqual({ user: signIn.body.user, signupEnabled: true });

    const signOut = await agent.post('/api/auth/sign-out');
    expect(signOut.status).toBe(204);
    expect(sessionCookie(signOut)).toMatch(/^sid=;.*Path=\/api/);

    // The old cookie value is now useless, even if replayed.
    const replay = await request(app).get('/api/auth/me').set('Cookie', cookie.split(';')[0]!);
    expect(replay.body.user).toBeNull();
  });

  it('gives a wrong password and an unknown email the same response', async () => {
    const { app } = makeApp();
    await request(app).post('/api/auth/sign-up').send(account);

    const wrong = await request(app).post('/api/auth/sign-in').send({ email: account.email, password: 'wrong password!' });
    const unknown = await request(app).post('/api/auth/sign-in').send({ email: 'nobody@shop.example', password: 'wrong password!' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body).toEqual({ error: { message: 'Email or password is incorrect' } });
  });

  it('reports no user, and whether sign-up is open, without a session', async () => {
    const { app } = makeApp({ allowSignup: false });

    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null, signupEnabled: false });
  });

  it('ignores forged and expired session cookies', async () => {
    const { app } = makeApp({ sessionTtlMs: 1 });
    const signUp = await request(app).post('/api/auth/sign-up').send(account);
    await new Promise((resolve) => setTimeout(resolve, 5));

    const expired = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(signUp)!.split(';')[0]!);
    const forged = await request(app).get('/api/auth/me').set('Cookie', 'sid=forged');

    expect(expired.body.user).toBeNull();
    expect(forged.body.user).toBeNull();
  });

  it('replaces any session the browser already holds on sign-in', async () => {
    const { db, app } = makeApp();
    const signUp = await request(app).post('/api/auth/sign-up').send(account);
    const planted = sessionCookie(signUp)!.split(';')[0]!;

    const signIn = await request(app)
      .post('/api/auth/sign-in')
      .set('Cookie', planted)
      .send({ email: account.email, password: account.password });

    expect(sessionCookie(signIn)!.split(';')[0]).not.toBe(planted);
    expect((await request(app).get('/api/auth/me').set('Cookie', planted)).body.user).toBeNull();
    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 1 });
  });

  it('never exposes a password hash', async () => {
    const { app } = makeApp({ cookieSecure: false });
    const agent = request.agent(app);
    const responses = [
      await agent.post('/api/auth/sign-up').send(account),
      await agent.get('/api/auth/me'),
      await agent.post('/api/auth/sign-in').send(account),
    ];

    for (const res of responses) {
      expect(JSON.stringify(res.body)).not.toMatch(/scrypt|password_?hash/i);
    }
  });
});

describe('rate limiting', () => {
  it('limits failed sign-ins per email across IPs, with a JSON message', async () => {
    const { app } = makeApp({ rateLimit: { signInPerEmail: 3 } });
    const attempt = () => request(app).post('/api/auth/sign-in').send({ email: 'target@shop.example', password: 'guess-guess-guess' });

    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
    const limited = await attempt();

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: { message: 'Too many attempts. Try again in a few minutes.' } });
    // Another account is unaffected.
    const other = await request(app).post('/api/auth/sign-in').send({ email: 'other@shop.example', password: 'guess-guess-guess' });
    expect(other.status).toBe(401);
  });

  it('does not count successful sign-ins', async () => {
    const { app } = makeApp({ rateLimit: { signInPerEmail: 2 } });
    await request(app).post('/api/auth/sign-up').send(account);

    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/auth/sign-in').send(account)).status).toBe(200);
    }
  });

  it('limits sign-ups per IP', async () => {
    const { app } = makeApp({ rateLimit: { signUpPerIp: 1 } });

    await request(app).post('/api/auth/sign-up').send(account);
    const second = await request(app).post('/api/auth/sign-up').send({ ...account, email: 'two@shop.example' });

    expect(second.status).toBe(429);
  });
});

describe('requireAuth (mounted on products in a later commit)', () => {
  function protectedApp() {
    const db = openDb(':memory:');
    const sessions = createSessionsRepo(db);
    const opts = cookieOptions({ secure: false, maxAgeMs: 60_000 });
    const app = express();
    app.use(cookieParser());
    app.get('/api/private', requireAuth(sessions, opts), (req, res) => res.json({ user: req.user }));
    app.use(errorHandler);
    db.prepare("INSERT INTO users (email, name, password_hash, created_at) VALUES ('a@b.co', 'A', 'x', 'now')").run();
    return { app, token: sessions.create(1, 60_000) };
  }

  it('lets a valid session through, attaches the user, and disables caching', async () => {
    const { app, token } = protectedApp();

    const res = await request(app).get('/api/private').set('Cookie', `sid=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 1, email: 'a@b.co' });
    expect(res.headers['cache-control']).toBe('private, no-store');
  });

  it('rejects a missing session, and clears a stale cookie', async () => {
    const { app } = protectedApp();

    const none = await request(app).get('/api/private');
    const stale = await request(app).get('/api/private').set('Cookie', 'sid=stale');

    expect(none.status).toBe(401);
    expect(none.body).toEqual({ error: { message: 'Sign in to continue' } });
    expect(none.headers['set-cookie']).toBeUndefined();
    expect(stale.status).toBe(401);
    expect(sessionCookie(stale)).toMatch(/^sid=;.*Path=\/api/);
  });
});

describe('env parsing', () => {
  it('parses booleans strictly and treats empty as unset', () => {
    expect(envInternals.parseBool('X', 'false', true)).toBe(false);
    expect(envInternals.parseBool('X', '', true)).toBe(true);
    expect(() => envInternals.parseBool('X', 'yes', true)).toThrow(/must be "true" or "false"/);
  });

  it('accepts a hop count or subnet for TRUST_PROXY and rejects "true"', () => {
    expect(envInternals.parseTrustProxy(undefined)).toBe(false);
    expect(envInternals.parseTrustProxy('false')).toBe(false);
    expect(envInternals.parseTrustProxy('1')).toBe(1);
    expect(envInternals.parseTrustProxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8');
    expect(() => envInternals.parseTrustProxy('true')).toThrow(/unsafe/);
  });
});

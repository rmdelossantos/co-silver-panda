import { describe, expect, it } from 'vitest';
import { createSessionsRepo } from '../src/auth/sessions.repo.js';
import { createUsersRepo, isUniqueViolation } from '../src/auth/users.repo.js';
import { openDb } from '../src/db/client.js';

const HOUR = 60 * 60 * 1000;

function setup(start = new Date('2026-11-25T10:00:00Z')) {
  const db = openDb(':memory:');
  let clock = start;
  const users = createUsersRepo(db);
  const sessions = createSessionsRepo(db, () => clock);
  const advance = (ms: number) => (clock = new Date(clock.getTime() + ms));
  return { db, users, sessions, advance };
}

describe('users repo', () => {
  it('stores emails lowercased and never returns the hash on the public shape', () => {
    const { users } = setup();

    const user = users.create({ email: '  Sam@Shop.Example ', name: 'Sam', passwordHash: 'scrypt$x' });

    expect(user).toEqual({ id: expect.any(Number), email: 'sam@shop.example', name: 'Sam', createdAt: expect.any(String) });
    expect(JSON.stringify(user)).not.toContain('scrypt');
    expect(users.findByEmail('SAM@shop.example')).toMatchObject({ user: { id: user.id }, passwordHash: 'scrypt$x' });
    expect(users.findById(user.id)).toEqual(user);
  });

  it('rejects a duplicate email regardless of case', () => {
    const { users } = setup();
    users.create({ email: 'sam@shop.example', name: 'Sam', passwordHash: 'h' });

    let error: unknown;
    try {
      users.create({ email: 'SAM@SHOP.EXAMPLE', name: 'Other', passwordHash: 'h' });
    } catch (err) {
      error = err;
    }

    expect(isUniqueViolation(error)).toBe(true);
  });
});

describe('sessions repo', () => {
  it('resolves a token to its user and stores only the token hash', () => {
    const { db, users, sessions } = setup();
    const user = users.create({ email: 'sam@shop.example', name: 'Sam', passwordHash: 'h' });

    const token = sessions.create(user.id, HOUR);

    expect(sessions.findUser(token)).toEqual(user);
    const stored = db.prepare('SELECT token_hash FROM sessions').all() as { token_hash: string }[];
    expect(stored).toHaveLength(1);
    expect(stored[0]!.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored[0]!.token_hash).not.toBe(token);
  });

  it('treats unknown, missing, and expired tokens as no session', () => {
    const { users, sessions, advance } = setup();
    const user = users.create({ email: 'sam@shop.example', name: 'Sam', passwordHash: 'h' });
    const token = sessions.create(user.id, HOUR);

    expect(sessions.findUser(undefined)).toBeUndefined();
    expect(sessions.findUser('forged-token')).toBeUndefined();
    advance(HOUR);
    expect(sessions.findUser(token)).toBeUndefined();
  });

  it('removes a session and cleans up expired ones', () => {
    const { users, sessions, advance } = setup();
    const user = users.create({ email: 'sam@shop.example', name: 'Sam', passwordHash: 'h' });
    const short = sessions.create(user.id, HOUR);
    const long = sessions.create(user.id, 10 * HOUR);

    sessions.remove(long);
    advance(2 * HOUR);

    expect(sessions.findUser(long)).toBeUndefined();
    expect(sessions.removeExpired()).toBe(1); // only `short` was left, and it has expired
    expect(sessions.findUser(short)).toBeUndefined();
  });

  it('deletes a user’s sessions when the user is deleted', () => {
    const { db, users, sessions } = setup();
    const user = users.create({ email: 'sam@shop.example', name: 'Sam', passwordHash: 'h' });
    sessions.create(user.id, HOUR);

    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

    expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 });
  });
});

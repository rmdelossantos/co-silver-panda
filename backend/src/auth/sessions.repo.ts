import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db/client.js';
import { toUser, type User, type UserRow } from './user.js';

export type SessionsRepo = ReturnType<typeof createSessionsRepo>;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSessionsRepo(db: Db, now: () => Date = () => new Date()) {
  const insert = db.prepare<[string, number, string, string]>(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  );
  const userForToken = db.prepare<[string, string], UserRow>(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `);
  const deleteByHash = db.prepare<[string]>('DELETE FROM sessions WHERE token_hash = ?');
  const deleteExpired = db.prepare<[string]>('DELETE FROM sessions WHERE expires_at <= ?');

  return {
    // Returns the raw token for the cookie; only its hash is stored.
    create(userId: number, ttlMs: number): string {
      const token = randomBytes(32).toString('base64url');
      const created = now();
      insert.run(hashToken(token), userId, created.toISOString(), new Date(created.getTime() + ttlMs).toISOString());
      return token;
    },

    // An unknown or expired token behaves exactly like no session.
    findUser(token: string | undefined): User | undefined {
      if (!token) return undefined;
      const row = userForToken.get(hashToken(token), now().toISOString());
      return row && toUser(row);
    },

    remove(token: string | undefined): void {
      if (token) deleteByHash.run(hashToken(token));
    },

    removeExpired(): number {
      return deleteExpired.run(now().toISOString()).changes;
    },
  };
}

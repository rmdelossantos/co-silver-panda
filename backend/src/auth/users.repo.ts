import type { Db } from '../db/client.js';
import { toUser, type User, type UserRow } from './user.js';

export type UsersRepo = ReturnType<typeof createUsersRepo>;

// The only place that reads password hashes.
export function createUsersRepo(db: Db) {
  const insert = db.prepare<[string, string, string, string], UserRow>(`
    INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?) RETURNING *
  `);
  const byEmail = db.prepare<[string], UserRow>('SELECT * FROM users WHERE email = ?');
  const byId = db.prepare<[number], UserRow>('SELECT * FROM users WHERE id = ?');

  return {
    // Throws a SQLITE_CONSTRAINT_UNIQUE error when the email is taken (case-insensitively).
    create(input: { email: string; name: string; passwordHash: string }): User {
      const row = insert.get(input.email.trim().toLowerCase(), input.name, input.passwordHash, new Date().toISOString());
      return toUser(row!);
    },

    // For sign-in only: returns the hash alongside the user.
    findByEmail(email: string): { user: User; passwordHash: string } | undefined {
      const row = byEmail.get(email.trim().toLowerCase());
      return row && { user: toUser(row), passwordHash: row.password_hash };
    },

    findById(id: number): User | undefined {
      const row = byId.get(id);
      return row && toUser(row);
    },
  };
}

export const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE';

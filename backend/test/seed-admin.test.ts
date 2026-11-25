import { describe, expect, it } from 'vitest';
import { verifyPassword } from '../src/auth/password.js';
import { ensureAdminAccount } from '../src/auth/seed-admin.js';
import { createUsersRepo } from '../src/auth/users.repo.js';
import { openDb } from '../src/db/client.js';

const admin = { email: 'Admin@Example.com', name: 'Admin', password: 'admin-password-123' };

describe('ensureAdminAccount', () => {
  it('creates the admin account once, with a hashed password', async () => {
    const users = createUsersRepo(openDb(':memory:'));

    expect(await ensureAdminAccount(users, admin)).toBe('created');

    const found = users.findByEmail('admin@example.com')!;
    expect(found.user).toMatchObject({ email: 'admin@example.com', name: 'Admin' });
    expect(found.passwordHash).toMatch(/^scrypt\$/);
    expect(await verifyPassword(admin.password, found.passwordHash)).toBe(true);
  });

  it('leaves an existing account untouched, so restarts never reset its password', async () => {
    const users = createUsersRepo(openDb(':memory:'));
    await ensureAdminAccount(users, admin);
    const before = users.findByEmail(admin.email)!.passwordHash;

    expect(await ensureAdminAccount(users, { ...admin, password: 'a-different-password' })).toBe('exists');
    expect(users.findByEmail(admin.email)!.passwordHash).toBe(before);
  });

  it('does nothing when no admin is configured', async () => {
    const users = createUsersRepo(openDb(':memory:'));

    expect(await ensureAdminAccount(users, {})).toBe('skipped');
  });

  it('defaults the name to "Admin"', async () => {
    const users = createUsersRepo(openDb(':memory:'));

    await ensureAdminAccount(users, { email: admin.email, password: admin.password });

    expect(users.findByEmail(admin.email)!.user.name).toBe('Admin');
  });

  it.each([
    [{ email: admin.email }, /both ADMIN_EMAIL and ADMIN_PASSWORD/],
    [{ password: admin.password }, /both ADMIN_EMAIL and ADMIN_PASSWORD/],
    [{ ...admin, password: 'short' }, /password: Password must be at least 12 characters/],
    [{ ...admin, email: 'not-an-email' }, /email: Enter a valid email address/],
  ])('refuses invalid settings with a clear error: %o', async (settings, message) => {
    const users = createUsersRepo(openDb(':memory:'));

    await expect(ensureAdminAccount(users, settings)).rejects.toThrow(message);
  });
});

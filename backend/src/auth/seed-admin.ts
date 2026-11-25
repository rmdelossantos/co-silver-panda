import { signUpSchema } from './auth.schema.js';
import { hashPassword } from './password.js';
import type { UsersRepo } from './users.repo.js';

export interface AdminAccount {
  email?: string;
  name?: string;
  password?: string;
}

// Creates the default admin account on startup when ADMIN_EMAIL and ADMIN_PASSWORD are set. Credentials
// come from the environment (never the image or the code), and an existing account is left untouched,
// so a restart can't reset a password that was changed later.
export async function ensureAdminAccount(users: UsersRepo, admin: AdminAccount): Promise<'created' | 'exists' | 'skipped'> {
  if (!admin.email && !admin.password) return 'skipped';
  if (!admin.email || !admin.password) throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD, or neither');

  // Same rules as sign-up, so the admin can't have a weaker password than everyone else.
  const parsed = signUpSchema.safeParse({ email: admin.email, name: admin.name || 'Admin', password: admin.password });
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid admin account settings (${problems})`);
  }

  if (users.findByEmail(parsed.data.email)) return 'exists';
  users.create({ email: parsed.data.email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password) });
  return 'created';
}

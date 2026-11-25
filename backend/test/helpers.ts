import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createSessionsRepo } from '../src/auth/sessions.repo.js';
import { createUsersRepo } from '../src/auth/users.repo.js';
import type { Db } from '../src/db/client.js';

// A supertest agent carrying a valid session cookie. The user and session are created straight through
// the repos (with a placeholder hash, which sessions never check), so tests don't pay for scrypt.
export function signedIn(app: App, db: Db) {
  const user = createUsersRepo(db).create({ email: 'tester@shop.example', name: 'Tester', passwordHash: 'placeholder' });
  const token = createSessionsRepo(db).create(user.id, 60 * 60 * 1000);
  return request.agent(app).set('Cookie', `sid=${token}`);
}

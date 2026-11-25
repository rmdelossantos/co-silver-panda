import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { testUser } from './fixtures';

// Signed in by default, so feature tests render the catalog; auth tests override /me per case.
// Initial handlers survive resetHandlers(), so per-test overrides go through server.use(...).
export const server = setupServer(
  http.get('/api/auth/me', () => HttpResponse.json({ user: testUser, signupEnabled: true })),
);

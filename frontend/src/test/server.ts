import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// AI is off by default (as on a server without a key); tests that need it override this handler.
// Initial handlers survive resetHandlers(), so per-test overrides go through server.use(...).
export const server = setupServer(http.get('/api/ai/status', () => HttpResponse.json({ enabled: false })));

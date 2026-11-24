import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/client.js';

describe('serving the built frontend (STATIC_DIR)', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    const dir = mkdtempSync(path.join(tmpdir(), 'catalog-web-'));
    writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Product Catalog</title>');
    writeFileSync(path.join(dir, 'app.js'), 'console.log("app")');
    app = createApp(openDb(':memory:'), { staticDir: dir });
  });

  it('serves index.html at the root', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Product Catalog</title>');
  });

  it('serves static assets', async () => {
    const res = await request(app).get('/app.js');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
  });

  it('falls back to index.html for client-side URLs such as ?category=', async () => {
    const res = await request(app).get('/some/page?category=Kitchen');

    expect(res.status).toBe(200);
    expect(res.text).toContain('Product Catalog');
  });

  it('keeps unknown API routes as JSON 404s rather than the UI', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: 'Not found' } });
  });

  it('still serves the API', async () => {
    const res = await request(app).get('/api/health');

    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('without STATIC_DIR', () => {
  it('does not serve anything outside /api', async () => {
    const res = await request(createApp(openDb(':memory:'), { staticDir: undefined })).get('/');

    expect(res.status).toBe(404);
  });
});

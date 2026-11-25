import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/client.js';
import { seedIfEmpty } from '../src/db/seed.js';
import { createProductsRepo } from '../src/products/products.repo.js';
import { signedIn } from './helpers.js';

const valid = { name: 'Wireless Mouse', price: 24.99, category: 'Electronics', description: 'Quiet clicks' };

let app: ReturnType<typeof createApp>;
let api: ReturnType<typeof signedIn>;

beforeEach(() => {
  const db = openDb(':memory:');
  app = createApp(db);
  api = signedIn(app, db);
});

const create = (body: object) => api.post('/api/products').send(body);

describe('POST /api/products', () => {
  it('creates a product and returns 201 with the stored record', async () => {
    const res = await create(valid);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(Number), ...valid });
    expect(res.body.createdAt).toBe(res.body.updatedAt);
  });

  it('trims strings and defaults description to empty', async () => {
    const res = await create({ name: '  Lamp  ', price: 10, category: ' Home ' });

    expect(res.body).toMatchObject({ name: 'Lamp', category: 'Home', description: '' });
  });

  it('keeps cent precision without float drift', async () => {
    const res = await create({ ...valid, price: 0.29 });

    expect(res.body.price).toBe(0.29);
  });

  it.each([
    ['missing name', { ...valid, name: undefined }, 'name'],
    ['blank name', { ...valid, name: '   ' }, 'name'],
    ['name over 100 chars', { ...valid, name: 'x'.repeat(101) }, 'name'],
    ['missing price', { ...valid, price: undefined }, 'price'],
    ['non-numeric price', { ...valid, price: 'abc' }, 'price'],
    ['numeric string price', { ...valid, price: '12' }, 'price'],
    ['zero price', { ...valid, price: 0 }, 'price'],
    ['negative price', { ...valid, price: -5 }, 'price'],
    ['more than 2 decimals', { ...valid, price: 1.999 }, 'price'],
    ['price over max', { ...valid, price: 1_000_001 }, 'price'],
    ['missing category', { ...valid, category: undefined }, 'category'],
    ['description over 500 chars', { ...valid, description: 'x'.repeat(501) }, 'description'],
  ])('rejects %s with 400', async (_label, body, field) => {
    const res = await create(body);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ field }));
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await api.post('/api/products').set('content-type', 'application/json').send('{bad');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid JSON body');
  });
});

describe('GET /api/products', () => {
  it('returns an empty list when there are no products', async () => {
    const res = await api.get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns products newest first', async () => {
    await create({ ...valid, name: 'First' });
    await create({ ...valid, name: 'Second' });

    const res = await api.get('/api/products');

    expect(res.body.map((p: { name: string }) => p.name)).toEqual(['Second', 'First']);
  });

  it('filters by category, case-insensitively', async () => {
    await create({ ...valid, category: 'Electronics' });
    await create({ ...valid, category: 'Kitchen' });

    const res = await api.get('/api/products').query({ category: 'electronics' });

    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('Electronics');
  });

  it('ignores a blank category filter', async () => {
    await create(valid);

    const res = await api.get('/api/products').query({ category: ' ' });

    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/products/categories', () => {
  it('returns distinct categories sorted alphabetically', async () => {
    await create({ ...valid, category: 'Kitchen' });
    await create({ ...valid, category: 'books' });
    await create({ ...valid, category: 'Kitchen' });

    const res = await api.get('/api/products/categories');

    expect(res.body).toEqual(['books', 'Kitchen']);
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product', async () => {
    const { body: created } = await create(valid);

    const res = await api.get(`/api/products/${created.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await api.get('/api/products/999');

    expect(res.status).toBe(404);
  });

  it.each(['abc', '0', '-1', '1.5'])('returns 400 for invalid id %s', async (id) => {
    const res = await api.get(`/api/products/${id}`);

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/products/:id', () => {
  it('updates all fields and bumps updatedAt', async () => {
    const { body: created } = await create(valid);
    const changes = { name: 'Trackball', price: 59.5, category: 'Accessories', description: '' };

    const res = await api.put(`/api/products/${created.id}`).send(changes);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: created.id, ...changes, createdAt: created.createdAt });
    expect(res.body.updatedAt >= created.updatedAt).toBe(true);
  });

  it('validates the body', async () => {
    const { body: created } = await create(valid);

    const res = await api.put(`/api/products/${created.id}`).send({ ...valid, price: 'free' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await api.put('/api/products/999').send(valid);

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/products/:id', () => {
  it('deletes the product and returns 204', async () => {
    const { body: created } = await create(valid);

    const res = await api.delete(`/api/products/${created.id}`);

    expect(res.status).toBe(204);
    expect((await api.get(`/api/products/${created.id}`)).status).toBe(404);
  });

  it('returns 404 when the product does not exist', async () => {
    const res = await api.delete('/api/products/999');

    expect(res.status).toBe(404);
  });
});

describe('without a session', () => {
  it.each([
    ['GET', '/api/products'],
    ['GET', '/api/products/categories'],
    ['GET', '/api/products/1'],
    ['POST', '/api/products'],
    ['PUT', '/api/products/1'],
    ['DELETE', '/api/products/1'],
  ] as const)('%s %s returns 401', async (method, path) => {
    const res = await request(app)[method.toLowerCase() as 'get'](path).send(valid);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: 'Sign in to continue' } });
  });

  it('does not change data when rejected', async () => {
    await request(app).post('/api/products').send(valid);

    expect((await api.get('/api/products')).body).toEqual([]);
  });
});

describe('unknown API routes', () => {
  it('return a JSON 404', async () => {
    const res = await api.get('/api/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: 'Not found' } });
  });
});

describe('seedIfEmpty', () => {
  it('seeds once and is a no-op on a non-empty db', () => {
    const repo = createProductsRepo(openDb(':memory:'));

    expect(seedIfEmpty(repo)).toBeGreaterThan(0);
    expect(seedIfEmpty(repo)).toBe(0);
  });
});

import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiRouter } from '../src/ai/ai.router.js';
import { createProductAssistant, type ProductAssistant } from '../src/ai/product-assistant.js';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db/client.js';
import { seedIfEmpty } from '../src/db/seed.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { createProductsRepo } from '../src/products/products.repo.js';

const draft = { description: 'A sturdy bamboo board.', category: 'Kitchen', categoryIsNew: false, sources: [] };

function fakeAssistant(): ProductAssistant & { draft: ReturnType<typeof vi.fn> } {
  return { draft: vi.fn(async () => draft) };
}

describe('AI routes with a fake assistant', () => {
  it('reports disabled and refuses drafts when no assistant is configured', async () => {
    const app = createApp(openDb(':memory:'));

    expect((await request(app).get('/api/ai/status')).body).toEqual({ enabled: false });
    const res = await request(app).post('/api/ai/product-draft').send({ name: 'Lamp' });
    expect(res.status).toBe(503);
    expect(res.body.error.message).toBe('AI drafting is not available right now.');
  });

  it('reports enabled and exposes nothing else', async () => {
    const app = createApp(openDb(':memory:'), { assistant: fakeAssistant() });

    expect((await request(app).get('/api/ai/status')).body).toEqual({ enabled: true });
  });

  it('accepts a request with only a name (blank optional fields)', async () => {
    const assistant = fakeAssistant();
    const app = createApp(openDb(':memory:'), { assistant });

    const res = await request(app).post('/api/ai/product-draft').send({ name: ' Bamboo Board ', category: '', description: '' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(draft);
    expect(assistant.draft).toHaveBeenCalledWith({ name: 'Bamboo Board', category: '', description: '' });
  });

  it('truncates over-limit context fields instead of rejecting them', async () => {
    const assistant = fakeAssistant();
    const app = createApp(openDb(':memory:'), { assistant });

    const res = await request(app)
      .post('/api/ai/product-draft')
      .send({ name: 'Lamp', category: 'c'.repeat(300), description: 'd'.repeat(3000), productId: 4 });

    expect(res.status).toBe(200);
    const sent = assistant.draft.mock.calls[0]![0];
    expect(sent.category).toHaveLength(200);
    expect(sent.description).toHaveLength(2000);
    expect(sent.productId).toBe(4);
  });

  it.each([
    ['missing name', {}],
    ['blank name', { name: '   ' }],
    ['name over 100 characters', { name: 'n'.repeat(101) }],
    ['invalid productId', { name: 'Lamp', productId: -1 }],
  ])('rejects %s with 400', async (_label, body) => {
    const app = createApp(openDb(':memory:'), { assistant: fakeAssistant() });

    expect((await request(app).post('/api/ai/product-draft').send(body)).status).toBe(400);
  });

  it('rate limits drafts per window, then resets', async () => {
    let clock = 0;
    const app = express();
    app.use(express.json());
    app.use('/api/ai', aiRouter(fakeAssistant(), { limit: 2, windowMs: 1000, now: () => clock }));
    app.use(errorHandler);
    const ask = () => request(app).post('/api/ai/product-draft').send({ name: 'Lamp' });

    expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(200);
    const limited = await ask();
    expect(limited.status).toBe(429);
    expect(limited.body.error.message).toBe('Too many AI requests. Try again in a minute.');

    clock = 1000;
    expect((await ask()).status).toBe(200);
  });
});

// The real SDK against a local stub of the Anthropic API: exercises the real error classes and parsing.
describe('AI routes with the real SDK against a stub API', () => {
  const SECRET = 'sk-ant-test-secret-key';
  const UPSTREAM = 'upstream detail that must not leak';
  let stub: Server;
  let baseURL: string;
  let reply: { status: number; body: unknown };

  const apiError = (status: number, type: string) => ({
    status,
    body: { type: 'error', error: { type, message: `${UPSTREAM} (${SECRET})` } },
  });
  const messageBody = (stopReason: string, text: string) => ({
    status: 200,
    body: {
      id: 'msg_stub', type: 'message', role: 'assistant', model: 'claude-opus-5-5',
      content: [{ type: 'text', text }], stop_reason: stopReason, stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    },
  });

  beforeAll(async () => {
    stub = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        res.writeHead(reply.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(reply.body));
      });
    });
    await new Promise<void>((resolve) => stub.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${(stub.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => stub.close(() => resolve())));

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  function appFor(url = baseURL) {
    const db = openDb(':memory:');
    const repo = createProductsRepo(db);
    seedIfEmpty(repo);
    const client = new Anthropic({ apiKey: SECRET, baseURL: url, maxRetries: 0, timeout: 5000 });
    return createApp(db, { assistant: createProductAssistant({ client, model: 'claude-opus-5-5', repo }) });
  }
  const ask = (app = appFor()) => request(app).post('/api/ai/product-draft').send({ name: 'Bamboo Cutting Board' });

  it('returns a grounded draft from a valid structured response', async () => {
    reply = messageBody('end_turn', JSON.stringify({ description: 'Gentle on knives.', category: 'KITCHEN' }));

    const res = await ask();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ description: 'Gentle on knives.', category: 'Kitchen', categoryIsNew: false });
  });

  it.each([
    ['refusal', messageBody('refusal', 'I can’t help with that.'), 422],
    ['truncated output', messageBody('max_tokens', '{"description": "cut'), 502],
    ['invalid JSON', messageBody('end_turn', 'not json'), 502],
    ['401 invalid key', apiError(401, 'authentication_error'), 503],
    ['402 billing', apiError(402, 'billing_error'), 503],
    ['403 permission', apiError(403, 'permission_error'), 503],
    ['404 unknown model', apiError(404, 'not_found_error'), 503],
    ['400 bad request', apiError(400, 'invalid_request_error'), 503],
    ['429 upstream rate limit', apiError(429, 'rate_limit_error'), 429],
    ['500 upstream error', apiError(500, 'api_error'), 502],
    ['529 overloaded', apiError(529, 'overloaded_error'), 502],
  ])('maps %s to %i without leaking upstream text or the key', async (_label, stubReply, status) => {
    reply = stubReply;

    const res = await ask();

    expect(res.status).toBe(status);
    expect(JSON.stringify(res.body)).not.toContain(UPSTREAM);
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });

  it('maps an unreachable API to 503', async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(closed.address() as AddressInfo).port}`;
    await new Promise<void>((resolve) => closed.close(() => resolve()));

    const res = await ask(appFor(url));

    expect(res.status).toBe(503);
    expect(res.body.error.message).toBe('AI drafting is not available right now.');
  });

  it('logs a credentials problem without the key or upstream body', async () => {
    reply = apiError(401, 'authentication_error');

    await ask();

    expect(console.error).toHaveBeenCalledWith('[ai] credentials rejected by Anthropic');
    for (const call of vi.mocked(console.error).mock.calls) {
      expect(JSON.stringify(call)).not.toContain(SECRET);
    }
  });
});

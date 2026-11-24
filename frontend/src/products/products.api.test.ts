import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/api-client';
import { makeProduct } from '../test/fixtures';
import { server } from '../test/server';
import { productsApi } from './products.api';

const input = { name: 'Lamp', price: 10, category: 'Home', description: '' };

describe('productsApi', () => {
  it('lists products', async () => {
    const products = [makeProduct()];
    server.use(http.get('/api/products', () => HttpResponse.json(products)));

    await expect(productsApi.list()).resolves.toEqual(products);
  });

  it('creates a product with a JSON body', async () => {
    let sent: unknown;
    server.use(
      http.post('/api/products', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(makeProduct(input), { status: 201 });
      }),
    );

    await productsApi.create(input);

    expect(sent).toEqual(input);
  });

  it('updates a product by id', async () => {
    server.use(http.put('/api/products/7', () => HttpResponse.json(makeProduct({ id: 7, ...input }))));

    await expect(productsApi.update(7, input)).resolves.toMatchObject({ id: 7, name: 'Lamp' });
  });

  it('deletes a product and resolves with no body on 204', async () => {
    server.use(http.delete('/api/products/7', () => new HttpResponse(null, { status: 204 })));

    await expect(productsApi.remove(7)).resolves.toBeUndefined();
  });

  it('throws ApiError with field details on 400', async () => {
    const details = [{ field: 'price', message: 'Price must be a number' }];
    server.use(
      http.post('/api/products', () =>
        HttpResponse.json({ error: { message: 'Validation failed', details } }, { status: 400 }),
      ),
    );

    const error = await productsApi.create(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'Validation failed', details });
  });

  it('replaces server-fault messages with plain language', async () => {
    server.use(
      http.get('/api/products', () => HttpResponse.json({ error: { message: 'Internal server error' } }, { status: 500 })),
    );

    await expect(productsApi.list()).rejects.toMatchObject({
      status: 500,
      message: 'The server ran into a problem. Try again in a moment.',
    });
  });

  it('keeps client-error messages from the server, e.g. 404', async () => {
    server.use(http.delete('/api/products/9', () => HttpResponse.json({ error: { message: 'Product not found' } }, { status: 404 })));

    await expect(productsApi.remove(9)).rejects.toMatchObject({ status: 404, message: 'Product not found' });
  });

  it('falls back to a plain message when a non-JSON error has no message', async () => {
    server.use(http.get('/api/products', () => new HttpResponse('oops', { status: 418 })));

    await expect(productsApi.list()).rejects.toMatchObject({
      status: 418,
      message: 'The server sent an unexpected response. Try again in a moment.',
    });
  });

  it('throws ApiError with status 0 on network failure', async () => {
    server.use(http.get('/api/products', () => HttpResponse.error()));

    await expect(productsApi.list()).rejects.toMatchObject({ status: 0 });
  });
});

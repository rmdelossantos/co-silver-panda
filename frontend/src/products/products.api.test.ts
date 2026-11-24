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

  it('throws ApiError with a fallback message when the body is not JSON', async () => {
    server.use(http.get('/api/products', () => new HttpResponse('oops', { status: 502 })));

    await expect(productsApi.list()).rejects.toMatchObject({ status: 502, message: 'Request failed (502)' });
  });

  it('throws ApiError with status 0 on network failure', async () => {
    server.use(http.get('/api/products', () => HttpResponse.error()));

    await expect(productsApi.list()).rejects.toMatchObject({ status: 0 });
  });
});

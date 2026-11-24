import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { createWrapper } from '../test/render';
import { server } from '../test/server';
import { useCreateProduct, useProducts } from './useProducts';

it('refetches the product list after a successful create', async () => {
  let products = [makeProduct({ id: 1, name: 'First' })];
  server.use(
    http.get('/api/products', () => HttpResponse.json(products)),
    http.post('/api/products', () => {
      const created = makeProduct({ id: 2, name: 'Second' });
      products = [created, ...products];
      return HttpResponse.json(created, { status: 201 });
    }),
  );

  const { result } = renderHook(() => ({ list: useProducts(), create: useCreateProduct() }), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.list.data).toHaveLength(1));

  await act(() => result.current.create.mutateAsync({ name: 'Second', price: 5, category: 'Home', description: '' }));

  await waitFor(() => expect(result.current.list.data?.map((p) => p.name)).toEqual(['Second', 'First']));
});

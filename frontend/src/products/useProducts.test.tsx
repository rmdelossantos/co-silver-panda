import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { expect, it } from 'vitest';
import { createQueryClient } from '../lib/query-client';
import { makeProduct } from '../test/fixtures';
import { server } from '../test/server';
import { useCreateProduct, useProducts } from './useProducts';

function wrapper({ children }: { children: ReactNode }) {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

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

  const { result } = renderHook(() => ({ list: useProducts(), create: useCreateProduct() }), { wrapper });
  await waitFor(() => expect(result.current.list.data).toHaveLength(1));

  await act(() => result.current.create.mutateAsync({ name: 'Second', price: 5, category: 'Home', description: '' }));

  await waitFor(() => expect(result.current.list.data?.map((p) => p.name)).toEqual(['Second', 'First']));
});

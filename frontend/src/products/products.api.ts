import { apiRequest } from '../lib/api-client';
import type { Product, ProductInput } from './product.types';

const base = '/api/products';

export const productsApi = {
  list: () => apiRequest<Product[]>(base),
  create: (input: ProductInput) => apiRequest<Product>(base, { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: ProductInput) =>
    apiRequest<Product>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id: number) => apiRequest<void>(`${base}/${id}`, { method: 'DELETE' }),
};

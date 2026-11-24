import type { Product } from '../products/product.types';

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Wireless Mouse',
    price: 24.99,
    category: 'Electronics',
    description: '',
    createdAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-24T10:00:00.000Z',
    ...overrides,
  };
}

import type { User } from '../auth/auth.types';
import type { Product } from '../products/product.types';

// The signed-in user the default /api/auth/me handler returns.
export const testUser: User = { id: 1, email: 'sam@shop.example', name: 'Sam Rivera', createdAt: '2026-11-24T09:00:00.000Z' };

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

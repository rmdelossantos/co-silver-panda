import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { filterByCategory, getCategories, resolveCategory } from './categories';

const products = [
  makeProduct({ id: 1, category: 'Kitchen' }),
  makeProduct({ id: 2, category: 'books' }),
  makeProduct({ id: 3, category: 'kitchen' }),
  makeProduct({ id: 4, category: 'Electronics' }),
];

describe('getCategories', () => {
  it('de-duplicates case-insensitively and sorts alphabetically', () => {
    expect(getCategories(products)).toEqual(['books', 'Electronics', 'Kitchen']);
  });
});

describe('filterByCategory', () => {
  it('returns everything when no category is selected', () => {
    expect(filterByCategory(products, null)).toHaveLength(4);
  });

  it('matches case-insensitively', () => {
    expect(filterByCategory(products, 'KITCHEN').map((p) => p.id)).toEqual([1, 3]);
  });
});

describe('resolveCategory', () => {
  it('returns the listed spelling of a matching category', () => {
    expect(resolveCategory(['Kitchen'], 'kitchen')).toBe('Kitchen');
  });

  it('falls back to null for an unknown category', () => {
    expect(resolveCategory(['Kitchen'], 'Garden')).toBeNull();
  });
});

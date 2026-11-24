import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { categoryTone, filterByCategory, getCategories, resolveCategory } from './categories';
import { CATEGORY_TONES } from './category-tones';

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

describe('categoryTone', () => {
  const tone = (category: string) => categoryTone(category, CATEGORY_TONES.length);

  it('gives the seed categories distinct tones', () => {
    const seed = ['Books', 'Electronics', 'Home', 'Kitchen', 'Sports'];

    expect(new Set(seed.map(tone)).size).toBe(seed.length);
  });

  it('depends only on the name, case-insensitively and ignoring surrounding spaces', () => {
    expect(tone(' kitchen ')).toBe(tone('Kitchen'));
    expect(tone('Kitchen')).toBe(tone('Kitchen'));
  });

  it('always returns a valid tone index', () => {
    for (const name of ['', 'a', 'Professional Kitchen & Restaurant Supplies', '日本語', '🍳']) {
      expect(tone(name)).toBeGreaterThanOrEqual(0);
      expect(tone(name)).toBeLessThan(CATEGORY_TONES.length);
    }
  });
});

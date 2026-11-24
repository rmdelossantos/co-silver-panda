import type { Product } from './product.types';

const sameCategory = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;

// Distinct categories, de-duplicated case-insensitively and sorted alphabetically.
export function getCategories(products: Product[]): string[] {
  const categories: string[] = [];
  for (const { category } of products) {
    if (!categories.some((c) => sameCategory(c, category))) categories.push(category);
  }
  return categories.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function filterByCategory(products: Product[], category: string | null): Product[] {
  if (!category) return products;
  return products.filter((p) => sameCategory(p.category, category));
}

// Returns the matching category as listed, or null ("All") if it no longer exists.
export function resolveCategory(categories: string[], category: string | null): string | null {
  if (!category) return null;
  return categories.find((c) => sameCategory(c, category)) ?? null;
}

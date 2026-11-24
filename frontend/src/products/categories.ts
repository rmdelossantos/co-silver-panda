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

const categoryKey = (category: string) => category.trim().toLowerCase();

// FNV-1a: a small, stable string hash, so a category's tone depends only on its own name.
function hashName(name: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

// Same name, same tone, always: the tone depends only on the category's own (case-insensitive) name, so
// adding, removing, or filtering other categories never recolors it. Two unrelated categories may share a
// tone, which is fine because every badge also shows its name.
export const categoryTone = (category: string, toneCount: number) => hashName(categoryKey(category)) % toneCount;

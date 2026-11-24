import type { Db } from '../db/client.js';
import type { Product, ProductInput } from './product.schema.js';

interface ProductRow {
  id: number;
  name: string;
  price_cents: number;
  category: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Letters/digits only, each token quoted, so user text cannot inject FTS5 query syntax.
const toMatchQuery = (text: string) =>
  [...new Set(text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])]
    .slice(0, 16)
    .map((token) => `"${token}"`)
    .join(' OR ');

// Prices are stored as integer cents to avoid floating point drift.
const toCents = (price: number) => Math.round(price * 100);

const toProduct = (row: ProductRow): Product => ({
  id: row.id,
  name: row.name,
  price: row.price_cents / 100,
  category: row.category,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type ProductsRepo = ReturnType<typeof createProductsRepo>;

export function createProductsRepo(db: Db) {
  const listAll = db.prepare<[], ProductRow>('SELECT * FROM products ORDER BY created_at DESC, id DESC');
  const listByCategory = db.prepare<[string], ProductRow>(
    'SELECT * FROM products WHERE category = ? COLLATE NOCASE ORDER BY created_at DESC, id DESC',
  );
  const getById = db.prepare<[number], ProductRow>('SELECT * FROM products WHERE id = ?');
  const listCategories = db.prepare<[], { category: string }>(
    'SELECT DISTINCT category FROM products ORDER BY category COLLATE NOCASE',
  );
  const insert = db.prepare<[string, number, string, string, string, string], ProductRow>(`
    INSERT INTO products (name, price_cents, category, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING *
  `);
  const updateById = db.prepare<[string, number, string, string, string, number], ProductRow>(`
    UPDATE products
    SET name = ?, price_cents = ?, category = ?, description = ?, updated_at = ?
    WHERE id = ?
    RETURNING *
  `);
  const deleteById = db.prepare<[number]>('DELETE FROM products WHERE id = ?');
  const countAll = db.prepare<[], { count: number }>('SELECT COUNT(*) AS count FROM products');
  // bm25 weights follow the FTS column order: name 5, category 3, description 1.
  // `IS NOT ?` (not `!=`) so a null excludeId keeps every row.
  const searchFts = db.prepare<[string, number | null, number], ProductRow>(`
    SELECT p.* FROM products_fts JOIN products p ON p.id = products_fts.rowid
    WHERE products_fts MATCH ? AND p.id IS NOT ?
    ORDER BY bm25(products_fts, 5.0, 3.0, 1.0)
    LIMIT ?
  `);

  return {
    list(category?: string): Product[] {
      const rows = category ? listByCategory.all(category) : listAll.all();
      return rows.map(toProduct);
    },

    get(id: number): Product | undefined {
      const row = getById.get(id);
      return row && toProduct(row);
    },

    categories(): string[] {
      return listCategories.all().map((r) => r.category);
    },

    create(input: ProductInput, now = new Date().toISOString()): Product {
      const row = insert.get(input.name, toCents(input.price), input.category, input.description, now, now);
      return toProduct(row!);
    },

    update(id: number, input: ProductInput): Product | undefined {
      const now = new Date().toISOString();
      const row = updateById.get(input.name, toCents(input.price), input.category, input.description, now, id);
      return row && toProduct(row);
    },

    remove(id: number): boolean {
      return deleteById.run(id).changes > 0;
    },

    // Products most similar to free text (name, category, description), best match first.
    searchSimilar(text: string, { limit = 5, excludeId }: { limit?: number; excludeId?: number } = {}): Product[] {
      const query = toMatchQuery(text);
      if (!query) return []; // FTS5 rejects an empty MATCH (e.g. "A" or emoji-only text)
      return searchFts.all(query, excludeId ?? null, limit).map(toProduct);
    },

    count(): number {
      return countAll.get()!.count;
    },
  };
}

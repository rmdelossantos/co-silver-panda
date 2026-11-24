import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { openDb } from '../src/db/client.js';
import { seedIfEmpty } from '../src/db/seed.js';
import { createProductsRepo, type ProductsRepo } from '../src/products/products.repo.js';

const names = (products: { name: string }[]) => products.map((p) => p.name);

describe('searchSimilar', () => {
  let repo: ProductsRepo;

  beforeEach(() => {
    repo = createProductsRepo(openDb(':memory:'));
    seedIfEmpty(repo);
  });

  it('finds products by name tokens', () => {
    expect(names(repo.searchSimilar('wireless mouse'))[0]).toBe('Wireless Mouse');
  });

  it('matches word stems ("keyboards" finds "Keyboard")', () => {
    expect(names(repo.searchSimilar('keyboards'))).toContain('Mechanical Keyboard');
  });

  it('returns hits when no product is excluded (add mode)', () => {
    expect(repo.searchSimilar('kitchen').length).toBeGreaterThan(0);
  });

  it('excludes the product being edited', () => {
    const mouse = repo.searchSimilar('wireless mouse')[0]!;

    expect(names(repo.searchSimilar('wireless mouse', { excludeId: mouse.id }))).not.toContain('Wireless Mouse');
  });

  it('ranks name matches above description-only matches', () => {
    const lamp = repo.create({ name: 'Bamboo Lamp', price: 30, category: 'Home', description: '' });
    repo.create({ name: 'Desk Organizer', price: 20, category: 'Home', description: 'Pairs well with any lamp.' });

    expect(repo.searchSimilar('lamp')[0]!.id).toBe(lamp.id);
  });

  it('respects the limit', () => {
    expect(repo.searchSimilar('kitchen electronics sports home books', { limit: 2 })).toHaveLength(2);
  });

  it('follows updates and deletes', () => {
    const created = repo.create({ name: 'Zebra Mug', price: 9, category: 'Kitchen', description: '' });
    expect(names(repo.searchSimilar('zebra'))).toEqual(['Zebra Mug']);

    repo.update(created.id, { name: 'Quokka Mug', price: 9, category: 'Kitchen', description: '' });
    expect(repo.searchSimilar('zebra')).toEqual([]);
    expect(names(repo.searchSimilar('quokka'))).toEqual(['Quokka Mug']);

    repo.remove(created.id);
    expect(repo.searchSimilar('quokka')).toEqual([]);
  });

  it.each(['A', '🍳', '', '   '])('returns [] for text with no searchable tokens: %j', (text) => {
    expect(repo.searchSimilar(text)).toEqual([]);
  });

  it.each(['" OR NEAR(*', "'; DROP TABLE products; --", 'mouse AND NOT', 'col:lamp ^start*'])(
    'treats FTS syntax in input as plain words: %j',
    (text) => {
      expect(() => repo.searchSimilar(text)).not.toThrow();
    },
  );
});

describe('existing databases', () => {
  it('backfills the index for a database created before full-text search existed', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'catalog-')), 'old.db');
    const old = new Database(file);
    old.exec(`
      CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, price_cents INTEGER NOT NULL,
        category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      INSERT INTO products (name, price_cents, category, description, created_at, updated_at)
      VALUES ('Cast Iron Skillet', 4599, 'Kitchen', 'Pre-seasoned', '2026-01-01', '2026-01-01');
    `);
    old.close();

    const repo = createProductsRepo(openDb(file));

    expect(names(repo.searchSimilar('skillet'))).toEqual(['Cast Iron Skillet']);
  });

  it('does not duplicate index entries when reopened', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'catalog-')), 'catalog.db');
    seedIfEmpty(createProductsRepo(openDb(file)));

    const reopened = createProductsRepo(openDb(file));

    expect(names(reopened.searchSimilar('skillet'))).toEqual(['Cast Iron Skillet']);
  });
});

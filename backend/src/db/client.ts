import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = Database.Database;

const schema = `
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    category    TEXT    NOT NULL CHECK (length(category) BETWEEN 1 AND 50),
    description TEXT    NOT NULL DEFAULT '' CHECK (length(description) <= 500),
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_products_category ON products (category COLLATE NOCASE);
`;

// Pass ':memory:' for an isolated in-memory database (used by tests).
export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(schema);
  return db;
}

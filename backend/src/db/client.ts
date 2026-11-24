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

  -- Full-text index over products (external content), kept in sync by triggers. Used to retrieve
  -- similar products for AI suggestions; column order matters for the bm25() weights in the repo.
  CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
    name, category, description, content='products', content_rowid='id', tokenize='porter unicode61'
  );
  CREATE TRIGGER IF NOT EXISTS products_fts_insert AFTER INSERT ON products BEGIN
    INSERT INTO products_fts(rowid, name, category, description) VALUES (new.id, new.name, new.category, new.description);
  END;
  CREATE TRIGGER IF NOT EXISTS products_fts_delete AFTER DELETE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, name, category, description)
    VALUES ('delete', old.id, old.name, old.category, old.description);
  END;
  CREATE TRIGGER IF NOT EXISTS products_fts_update AFTER UPDATE ON products BEGIN
    INSERT INTO products_fts(products_fts, rowid, name, category, description)
    VALUES ('delete', old.id, old.name, old.category, old.description);
    INSERT INTO products_fts(rowid, name, category, description) VALUES (new.id, new.name, new.category, new.description);
  END;
`;

// Pass ':memory:' for an isolated in-memory database (used by tests).
export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('journal_mode = WAL');

  const hadFtsIndex = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'products_fts'")
    .get();
  db.exec(schema);
  // Databases created before the index existed (e.g. a Docker volume) get a one-time backfill.
  if (!hadFtsIndex) db.exec("INSERT INTO products_fts(products_fts) VALUES ('rebuild')");

  return db;
}

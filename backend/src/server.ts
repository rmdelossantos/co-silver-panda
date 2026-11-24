import { createApp } from './app.js';
import { createSessionsRepo } from './auth/sessions.repo.js';
import { openDb } from './db/client.js';
import { seedIfEmpty } from './db/seed.js';
import { env } from './env.js';
import { createProductsRepo } from './products/products.repo.js';

const db = openDb(env.DB_PATH);
createSessionsRepo(db).removeExpired();

const seeded = seedIfEmpty(createProductsRepo(db));
if (seeded) console.log(`Seeded ${seeded} sample products`);

const server = createApp(db).listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// Containers stop with SIGTERM (Docker, Kubernetes); as PID 1, Node would otherwise ignore it until killed.
// Finish in-flight requests, then close the database so the SQLite WAL is checkpointed cleanly.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    console.log(`${signal} received, shutting down`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 5_000).unref();
  });
}

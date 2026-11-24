import { createClaudeClient } from './ai/claude.js';
import { createProductAssistant } from './ai/product-assistant.js';
import { createApp } from './app.js';
import { openDb } from './db/client.js';
import { seedIfEmpty } from './db/seed.js';
import { env } from './env.js';
import { createProductsRepo } from './products/products.repo.js';

const db = openDb(env.DB_PATH);

const repo = createProductsRepo(db);
const seeded = seedIfEmpty(repo);
if (seeded) console.log(`Seeded ${seeded} sample products`);

const assistant = env.AI_ENABLED
  ? createProductAssistant({ client: createClaudeClient(), model: env.AI_MODEL, repo })
  : undefined;
console.log(assistant ? `AI suggestions on (${env.AI_MODEL})` : 'AI suggestions off (set ANTHROPIC_API_KEY to enable)');

const server = createApp(db, { assistant }).listen(env.PORT, () => {
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

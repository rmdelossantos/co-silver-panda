import { createApp } from './app.js';
import { openDb } from './db/client.js';
import { seedIfEmpty } from './db/seed.js';
import { env } from './env.js';
import { createProductsRepo } from './products/products.repo.js';

const db = openDb(env.DB_PATH);

const seeded = seedIfEmpty(createProductsRepo(db));
if (seeded) console.log(`Seeded ${seeded} sample products`);

createApp(db).listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

import { createApp } from './app.js';
import { openDb } from './db/client.js';
import { env } from './env.js';

const db = openDb(env.DB_PATH);

createApp(db).listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

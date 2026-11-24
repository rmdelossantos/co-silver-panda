import cors from 'cors';
import express from 'express';
import type { Db } from './db/client.js';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { createProductsRepo } from './products/products.repo.js';
import { productsRouter } from './products/products.router.js';

// Kept separate from server.ts so tests can import the app without binding a port.
export function createApp(db: Db) {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/products', productsRouter(createProductsRepo(db)));

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

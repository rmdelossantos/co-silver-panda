import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { aiRouter } from './ai/ai.router.js';
import type { ProductAssistant } from './ai/product-assistant.js';
import type { Db } from './db/client.js';
import { env } from './env.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import { createProductsRepo } from './products/products.repo.js';
import { productsRouter } from './products/products.router.js';

interface AppOptions {
  staticDir?: string;
  // AI suggestions; omitted when no API key is configured, which turns the feature off.
  assistant?: ProductAssistant;
}

// Kept separate from server.ts so tests can import the app without binding a port.
export function createApp(db: Db, { staticDir = env.STATIC_DIR, assistant }: AppOptions = {}) {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/products', productsRouter(createProductsRepo(db)));
  app.use('/api/ai', aiRouter(assistant));

  app.use('/api', notFound);

  // Single-origin deploys: serve the built UI, and fall back to index.html for client-side URLs.
  if (staticDir) {
    app.use(express.static(staticDir, { index: 'index.html', maxAge: '1h' }));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(path.resolve(staticDir), 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}

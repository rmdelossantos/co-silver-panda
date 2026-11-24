import cors from 'cors';
import express from 'express';
import { env } from './env.js';

// Kept separate from server.ts so tests can import the app without binding a port.
export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

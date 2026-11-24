import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from './http-error.js';

export const notFound: RequestHandler = () => {
  throw new HttpError(404, 'Not found');
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, details: err.details } });
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Invalid JSON body' } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
};

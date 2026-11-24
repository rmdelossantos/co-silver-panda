import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from './http-error.js';

// Replaces req.body with the parsed (trimmed, defaulted) value on success.
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new HttpError(400, 'Validation failed', details);
    }
    req.body = result.data;
    next();
  };
}

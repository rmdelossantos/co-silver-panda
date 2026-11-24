import Anthropic from '@anthropic-ai/sdk';
import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/http-error.js';
import { validateBody } from '../middleware/validate.js';
import { AiDraftError, type DraftInput, type ProductAssistant } from './product-assistant.js';

// Blank optional fields are normal (the form sends ''). Context fields are truncated rather than
// rejected, because the form allows over-limit text before its own validation runs.
export const draftRequestSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  category: z.string().trim().optional().default('').transform((s) => s.slice(0, 200)),
  description: z.string().trim().optional().default('').transform((s) => s.slice(0, 2000)),
  productId: z.number().int().positive().optional(),
});

const UNAVAILABLE = 'AI drafting is not available right now.';

// Fixed window per process. A cost guard for an unauthenticated endpoint that spends money, not access
// control; global rather than per IP since no `trust proxy` is configured.
function fixedWindowLimit(limit: number, windowMs: number, now: () => number): RequestHandler {
  let windowStart = now();
  let count = 0;
  return (_req, _res, next) => {
    if (now() - windowStart >= windowMs) {
      windowStart = now();
      count = 0;
    }
    if (++count > limit) throw new HttpError(429, 'Too many AI requests. Try again in a minute.');
    next();
  };
}

// Most specific first; APIConnectionError extends APIError, so it is checked before the catch-all.
// Messages are fixed strings: upstream error text never reaches the client.
export function toHttpError(err: unknown): unknown {
  if (err instanceof AiDraftError) {
    return err.kind === 'refused'
      ? new HttpError(422, 'The AI declined to draft this product. Try a different name, or write it yourself.')
      : new HttpError(502, 'The AI returned an unusable draft. Try again.');
  }
  if (err instanceof Anthropic.RateLimitError) return new HttpError(429, 'The AI service is busy. Try again in a minute.');
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error('[ai] credentials rejected by Anthropic');
    return new HttpError(503, UNAVAILABLE);
  }
  if (err instanceof Anthropic.PaymentRequiredError) {
    console.error('[ai] billing issue reported by Anthropic');
    return new HttpError(503, UNAVAILABLE);
  }
  if (err instanceof Anthropic.NotFoundError || err instanceof Anthropic.BadRequestError) {
    console.error('[ai] request rejected by Anthropic; check AI_MODEL');
    return new HttpError(503, UNAVAILABLE);
  }
  if (err instanceof Anthropic.APIConnectionError) return new HttpError(503, UNAVAILABLE);
  if (err instanceof Anthropic.APIError) return new HttpError(502, 'AI drafting failed. Try again.');
  return err;
}

interface AiRouterOptions {
  limit?: number;
  windowMs?: number;
  now?: () => number;
}

export function aiRouter(assistant: ProductAssistant | undefined, { limit = 20, windowMs = 60_000, now = Date.now }: AiRouterOptions = {}) {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json({ enabled: assistant !== undefined });
  });

  // Disabled first, so a server without a key never answers 429.
  const requireAssistant: RequestHandler = (_req, _res, next) => {
    if (!assistant) throw new HttpError(503, UNAVAILABLE);
    next();
  };

  router.post(
    '/product-draft',
    requireAssistant,
    validateBody(draftRequestSchema),
    fixedWindowLimit(limit, windowMs, now),
    async (req, res) => {
      try {
        res.json(await assistant!.draft(req.body as DraftInput));
      } catch (err) {
        throw toHttpError(err);
      }
    },
  );

  return router;
}

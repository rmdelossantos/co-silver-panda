import { Router } from 'express';
import { HttpError } from '../middleware/http-error.js';
import { validateBody } from '../middleware/validate.js';
import { productInputSchema } from './product.schema.js';
import type { ProductsRepo } from './products.repo.js';

function parseId(raw: unknown): number {
  const id = typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid product id');
  return id;
}

export function productsRouter(repo: ProductsRepo) {
  const router = Router();

  router.get('/', (req, res) => {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    res.json(repo.list(category || undefined));
  });

  // Registered before '/:id' so "categories" is not parsed as an id.
  router.get('/categories', (_req, res) => {
    res.json(repo.categories());
  });

  router.get('/:id', (req, res) => {
    const product = repo.get(parseId(req.params.id));
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(product);
  });

  router.post('/', validateBody(productInputSchema), (req, res) => {
    res.status(201).json(repo.create(req.body));
  });

  router.put('/:id', validateBody(productInputSchema), (req, res) => {
    const product = repo.update(parseId(req.params.id), req.body);
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(product);
  });

  router.delete('/:id', (req, res) => {
    if (!repo.remove(parseId(req.params.id))) throw new HttpError(404, 'Product not found');
    res.status(204).end();
  });

  return router;
}

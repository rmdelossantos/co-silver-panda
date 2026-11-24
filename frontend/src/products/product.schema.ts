import { z } from 'zod';

// Mirrors the backend rules in backend/src/products/product.schema.ts.
const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  // The input is text so a non-numeric entry gets a clear message instead of being silently blanked.
  price: z
    .string()
    .trim()
    .min(1, 'Price is required')
    .refine((v) => /^-?\d+(\.\d+)?$/.test(v), 'Price must be a number')
    .transform(Number)
    .pipe(
      z
        .number()
        .positive('Price must be greater than 0')
        .max(1_000_000, 'Price must be at most 1,000,000')
        .refine(hasAtMostTwoDecimals, 'Price can have at most 2 decimal places'),
    ),
  category: z.string().trim().min(1, 'Category is required').max(50, 'Category must be at most 50 characters'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters'),
});

export type ProductFormValues = z.input<typeof productFormSchema>;

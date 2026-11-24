import { z } from 'zod';

const hasAtMostTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

export const productInputSchema = z.object({
  name: z.string({ error: 'Name is required' }).trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  price: z
    .number({ error: 'Price must be a number' })
    .positive('Price must be greater than 0')
    .max(1_000_000, 'Price must be at most 1,000,000')
    .refine(hasAtMostTwoDecimals, 'Price can have at most 2 decimal places'),
  category: z
    .string({ error: 'Category is required' })
    .trim()
    .min(1, 'Category is required')
    .max(50, 'Category must be at most 50 characters'),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').default(''),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export interface Product extends ProductInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

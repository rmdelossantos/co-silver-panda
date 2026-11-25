import { z } from 'zod';

// Mirrors backend/src/auth/auth.schema.ts.
const email = z.string().trim().toLowerCase().min(1, 'Email is required').max(254).pipe(z.email('Enter a valid email address'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email,
  password: z.string().min(12, 'Use at least 12 characters').max(128, 'Use at most 128 characters'),
});

export type SignInValues = z.input<typeof signInSchema>;
export type SignUpValues = z.input<typeof signUpSchema>;

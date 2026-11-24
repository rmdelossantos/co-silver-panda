import { z } from 'zod';

// Trim and lowercase before checking the format: `z.email().trim()` would reject " X@Y.co ".
const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(254, 'Email must be at most 254 characters')
  .pipe(z.email('Enter a valid email address'));

// Length over composition rules (NIST 800-63B). Not trimmed: spaces are valid password characters.
const newPassword = z
  .string({ error: 'Password is required' })
  .min(12, 'Use at least 12 characters')
  .max(128, 'Use at most 128 characters');

export const signUpSchema = z.object({
  email,
  name: z.string({ error: 'Name is required' }).trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  password: newPassword,
});

export const signInSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(128),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

import { ApiError } from '../lib/api-client';

// Form-level copy for failures that aren't about a single field.
export function formErrorCopy(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many attempts. Wait a few minutes and try again.';
    if (error.status === 0) return error.message; // network: "Could not reach the server…"
    if (error.status < 500) return error.message; // e.g. "Email or password is incorrect"
  }
  return 'Something went wrong on our side. Try again in a moment.';
}

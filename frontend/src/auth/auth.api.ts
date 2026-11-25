import { apiRequest } from '../lib/api-client';
import type { Session, SignInInput, SignUpInput, User } from './auth.types';

const base = '/api/auth';

export const authApi = {
  me: () => apiRequest<Session>(`${base}/me`),
  signIn: (input: SignInInput) => apiRequest<{ user: User }>(`${base}/sign-in`, { method: 'POST', body: JSON.stringify(input) }),
  signUp: (input: SignUpInput) => apiRequest<{ user: User }>(`${base}/sign-up`, { method: 'POST', body: JSON.stringify(input) }),
  signOut: () => apiRequest<void>(`${base}/sign-out`, { method: 'POST' }),
};

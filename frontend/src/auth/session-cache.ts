import type { QueryClient } from '@tanstack/react-query';
import type { Session, User } from './auth.types';

export const authKeys = { me: ['auth', 'me'] as const };

// Drop everything cached for the previous user, but keep the session query itself: useSession's observer
// is subscribed to it, and removing it (as qc.clear() would) strands that observer on stale data.
export function resetUserData(qc: QueryClient) {
  qc.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
}

const signupEnabled = (qc: QueryClient) => qc.getQueryData<Session>(authKeys.me)?.signupEnabled ?? true;

export function startSession(qc: QueryClient, user: User) {
  const enabled = signupEnabled(qc);
  resetUserData(qc);
  qc.setQueryData<Session>(authKeys.me, { user, signupEnabled: enabled });
}

export function endSession(qc: QueryClient) {
  const enabled = signupEnabled(qc); // read before anything is removed
  resetUserData(qc);
  qc.setQueryData<Session>(authKeys.me, { user: null, signupEnabled: enabled });
}

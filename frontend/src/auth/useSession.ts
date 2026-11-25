import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './auth.api';
import { authKeys, endSession, startSession } from './session-cache';

// The session doesn't go stale on its own; sign-in, sign-out, and a 401 from any request update it.
export function useSession() {
  return useQuery({ queryKey: authKeys.me, queryFn: authApi.me, staleTime: Infinity });
}

// `meta.auth` keeps a failed sign-in (401) from being treated as an ended session by the query client.
export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.signIn, meta: { auth: true }, onSuccess: ({ user }) => startSession(qc, user) });
}

export function useSignUp() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.signUp, meta: { auth: true }, onSuccess: ({ user }) => startSession(qc, user) });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.signOut, meta: { auth: true }, onSettled: () => endSession(qc) });
}

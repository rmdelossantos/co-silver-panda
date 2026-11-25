import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { endSession } from '../auth/session-cache';
import { ApiError } from './api-client';

const isClientError = (error: unknown) => error instanceof ApiError && error.status >= 400 && error.status < 500;

export function createQueryClient() {
  // A 401 from any data request means the session ended (expired or signed out elsewhere): return to
  // sign-in once, with an explanation. Auth requests opt out with `meta.auth`, since a failed sign-in is
  // also a 401. Built in here so test clients get the same behaviour as the app.
  function handleUnauthorized(error: unknown, meta: Record<string, unknown> | undefined) {
    if (!(error instanceof ApiError) || error.status !== 401 || meta?.auth) return;
    endSession(client);
    toast.info('Your session ended. Sign in again to continue.', { id: 'session-ended' });
  }

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => handleUnauthorized(error, query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _result, mutation) => handleUnauthorized(error, mutation.meta),
    }),
    defaultOptions: {
      // Retry once for network and server errors; a 4xx won't change on retry.
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
        refetchOnWindowFocus: false,
      },
    },
  });
  return client;
}

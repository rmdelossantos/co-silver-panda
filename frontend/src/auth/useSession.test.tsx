import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { apiRequest } from '../lib/api-client';
import { createQueryClient } from '../lib/query-client';
import { productsApi } from '../products/products.api';
import { makeProduct, testUser } from '../test/fixtures';
import { server } from '../test/server';
import type { User } from './auth.types';
import { authKeys } from './session-cache';
import { useSession, useSignIn, useSignOut } from './useSession';

const otherUser: User = { id: 7, email: 'ana@shop.example', name: 'Ana', createdAt: '2026-11-25T08:00:00.000Z' };

function wrapperFor(client = createQueryClient()) {
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  };
}

describe('session hooks', () => {
  it('moves the session observer from signed out to the signed-in user', async () => {
    // Start signed out, and sign in as someone other than the default test user, so a stranded
    // observer (the qc.clear() pitfall) would visibly fail.
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ user: null, signupEnabled: true })),
      http.post('/api/auth/sign-in', () => HttpResponse.json({ user: otherUser })),
    );
    const { wrapper } = wrapperFor();
    const { result } = renderHook(() => ({ session: useSession(), signIn: useSignIn() }), { wrapper });
    await waitFor(() => expect(result.current.session.data).toEqual({ user: null, signupEnabled: true }));

    await act(() => result.current.signIn.mutateAsync({ email: otherUser.email, password: 'correct horse battery' }));

    await waitFor(() => expect(result.current.session.data).toEqual({ user: otherUser, signupEnabled: true }));
  });

  it('clears data cached for the previous user on sign-out, keeping signupEnabled', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ user: testUser, signupEnabled: false })),
      http.post('/api/auth/sign-out', () => new HttpResponse(null, { status: 204 })),
    );
    const { client, wrapper } = wrapperFor();
    client.setQueryData(['products'], [makeProduct()]);
    const { result } = renderHook(() => ({ session: useSession(), signOut: useSignOut() }), { wrapper });
    await waitFor(() => expect(result.current.session.data?.user).toEqual(testUser));

    await act(() => result.current.signOut.mutateAsync());

    await waitFor(() => expect(result.current.session.data).toEqual({ user: null, signupEnabled: false }));
    expect(client.getQueryData(['products'])).toBeUndefined();
  });
});

describe('query client session handling', () => {
  it('signs out and explains when a data request returns 401', async () => {
    server.use(http.get('/api/products', () => HttpResponse.json({ error: { message: 'Sign in to continue' } }, { status: 401 })));
    const { client, wrapper } = wrapperFor();
    client.setQueryData(authKeys.me, { user: testUser, signupEnabled: true });

    renderHook(() => useQuery({ queryKey: ['products'], queryFn: productsApi.list }), { wrapper });

    await waitFor(() => expect(client.getQueryData(authKeys.me)).toEqual({ user: null, signupEnabled: true }));
  });

  it('does not treat a failed sign-in (401) as an ended session', async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ user: null, signupEnabled: true })),
      http.post('/api/auth/sign-in', () => HttpResponse.json({ error: { message: 'Email or password is incorrect' } }, { status: 401 })),
    );
    const { client, wrapper } = wrapperFor();
    client.setQueryData(['products'], [makeProduct()]);
    const { result } = renderHook(() => useSignIn(), { wrapper });

    await act(() => result.current.mutateAsync({ email: 'x@y.co', password: 'nope' }).catch(() => {}));

    expect(client.getQueryData(['products'])).toEqual([makeProduct()]); // nothing was reset
  });

  it('does not retry 4xx responses, but retries a server error once', async () => {
    // Built with createQueryClient() directly: the shared test wrapper turns retries off entirely.
    let notFound = 0;
    let serverError = 0;
    server.use(
      http.get('/api/products/missing', () => (notFound++, HttpResponse.json({ error: { message: 'x' } }, { status: 404 }))),
      http.get('/api/products/flaky', () => (serverError++, HttpResponse.json({ error: { message: 'x' } }, { status: 500 }))),
    );
    const { wrapper } = wrapperFor();
    const query = (key: string) => () => useQuery({ queryKey: [key], queryFn: () => apiRequest(`/api/products/${key}`), retryDelay: 0 });

    const missing = renderHook(query('missing'), { wrapper });
    const flaky = renderHook(query('flaky'), { wrapper });

    await waitFor(() => expect(missing.result.current.isError).toBe(true));
    await waitFor(() => expect(flaky.result.current.isError).toBe(true));
    expect(notFound).toBe(1);
    expect(serverError).toBe(2);
  });
});

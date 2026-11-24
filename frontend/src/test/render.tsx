import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { Toaster } from 'sonner';
import { createQueryClient } from '../lib/query-client';

function createTestQueryClient() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return client;
}

export function createWrapper() {
  const client = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

export function renderWithQueryClient(ui: ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

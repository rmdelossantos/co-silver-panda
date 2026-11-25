import { Package, RotateCw } from 'lucide-react';
import { Toaster } from 'sonner';
import { AuthScreen } from './auth/AuthScreen';
import { useSession } from './auth/useSession';
import { Button } from './components/Button';
import { ProductsPage } from './products/ProductsPage';

export default function App() {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-4 sm:px-6">
          <span className="grid size-7 place-items-center rounded-md bg-accent text-white" aria-hidden="true">
            <Package className="size-4" strokeWidth={2.25} />
          </span>
          <h1 className="text-[0.9375rem] font-semibold tracking-tight">Product Catalog</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <SessionGate />
      </main>
      <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </>
  );
}

// The catalog is shared but private: show it only to signed-in people.
function SessionGate() {
  const session = useSession();

  if (session.isPending) {
    return (
      <p role="status" className="py-16 text-center text-sm text-ink-muted">
        Loading…
      </p>
    );
  }
  // A network or server failure isn't the same as being signed out; don't send people to sign-in for it.
  if (session.isError) {
    return (
      <div role="alert" className="mx-auto max-w-sm rounded-xl border border-line bg-surface px-6 py-10 text-center shadow-xs">
        <p className="font-medium text-ink">Couldn’t reach the catalog</p>
        <p className="mt-1 text-sm text-ink-muted">{session.error.message}</p>
        <Button variant="primary" onClick={() => session.refetch()} className="mt-5">
          <RotateCw className="-ml-1 size-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }
  return session.data.user ? <ProductsPage /> : <AuthScreen signupEnabled={session.data.signupEnabled} />;
}

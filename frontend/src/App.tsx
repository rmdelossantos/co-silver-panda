import { RotateCw } from 'lucide-react';
import { AuthScreen } from './auth/AuthScreen';
import { useSession } from './auth/useSession';
import { Button } from './components/Button';
import { Header } from './components/Header';
import { ProductsPage } from './products/ProductsPage';

export default function App() {
  const session = useSession();
  return (
    <>
      <Header user={session.data?.user ?? null} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <SessionGate />
      </main>
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

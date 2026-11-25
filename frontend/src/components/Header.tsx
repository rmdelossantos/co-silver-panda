import { LogOut, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '../auth/auth.types';
import { useSignOut } from '../auth/useSession';
import { Button } from './Button';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

export function Header({ user }: { user: User | null }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2.5 px-4 sm:px-6">
        <span className="grid size-7 place-items-center rounded-md bg-accent text-white" aria-hidden="true">
          <Package className="size-4" strokeWidth={2.25} />
        </span>
        <h1 className="text-[0.9375rem] font-semibold tracking-tight">Product Catalog</h1>
        {user && <Account user={user} />}
      </div>
    </header>
  );
}

// One action, so a plain button rather than a menu.
function Account({ user }: { user: User }) {
  const signOut = useSignOut();

  return (
    <div className="ml-auto flex min-w-0 items-center gap-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-ink" title={user.email}>
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
          aria-hidden="true"
        >
          {initials(user.name)}
        </span>
        <span className="truncate max-sm:sr-only">{user.name}</span>
        <span className="sr-only">({user.email})</span>
      </span>
      <Button
        variant="ghost"
        onClick={() => signOut.mutate(undefined, { onSettled: () => toast.success('Signed out') })}
        aria-disabled={signOut.isPending}
        className="h-9 px-3 aria-disabled:opacity-55"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </Button>
    </div>
  );
}

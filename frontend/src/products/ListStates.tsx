import { PackageOpen, Plus, RotateCw, TriangleAlert } from 'lucide-react';
import { Button } from '../components/Button';

const panel = 'rounded-xl border border-line bg-surface px-6 py-14 text-center shadow-xs';

export function LoadingState() {
  return (
    <div role="status" aria-label="Loading products" className="overflow-hidden rounded-xl border border-line bg-surface">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-hover" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-hover" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded-md bg-hover max-sm:hidden" />
          <div className="h-3.5 w-14 animate-pulse rounded bg-hover" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className={panel}>
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden="true">
        <PackageOpen className="size-5" />
      </span>
      <p className="mt-4 font-medium text-ink">No products yet</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-ink-muted">
        Add your first product to start building the catalog.
      </p>
      <Button variant="primary" onClick={onAdd} className="mt-5">
        <Plus className="-ml-1 size-4" strokeWidth={2.25} aria-hidden="true" />
        Add your first product
      </Button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className={panel}>
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-danger-soft text-danger" aria-hidden="true">
        <TriangleAlert className="size-5" />
      </span>
      <p className="mt-4 font-medium text-ink">Couldn’t load products</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{message}</p>
      <Button onClick={onRetry} className="mt-5">
        <RotateCw className="-ml-1 size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

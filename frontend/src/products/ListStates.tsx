export function LoadingState() {
  return (
    <div role="status" aria-label="Loading products" className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  );
}

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
      <p className="font-medium text-gray-900">No products yet</p>
      <p className="mt-1 text-sm text-gray-500">Add your first product to start building the catalog.</p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
      >
        Add your first product
      </button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-medium text-red-800">Couldn’t load products</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}

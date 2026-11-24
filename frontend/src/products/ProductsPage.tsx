import { Plus } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { useSearchParam } from '../lib/useSearchParam';
import { filterByCategory, getCategories, resolveCategory } from './categories';
import { CategoryFilter } from './CategoryFilter';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { EmptyState, ErrorState, LoadingState } from './ListStates';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductList } from './ProductList';
import type { Product } from './product.types';
import { useProducts } from './useProducts';

export function ProductsPage() {
  const { data: products, isPending, isError, error, refetch } = useProducts();
  const [requestedCategory, setRequestedCategory] = useSearchParam('category');
  // The category we fell back from, kept so the summary can explain why "All" is showing.
  const [fallbackFrom, setFallbackFrom] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<Product | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  // Where keyboard focus goes after a delete removes the row that opened the dialog.
  const focusAfterDelete = useRef<number | 'heading' | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const categories = useMemo(() => getCategories(products ?? []), [products]);
  const category = resolveCategory(categories, requestedCategory);
  const visibleProducts = useMemo(() => filterByCategory(products ?? [], category), [products, category]);
  // A requested category with no products (last one deleted, or an old shared link) falls back to "All".
  // Reset it during render so it can't silently re-apply if that category reappears later.
  const missingCategory = products && requestedCategory && !category ? requestedCategory : null;
  if (missingCategory) {
    setFallbackFrom(missingCategory);
    setRequestedCategory(null);
  }
  const fallbackNotice = fallbackFrom && !resolveCategory(categories, fallbackFrom) ? fallbackFrom : null;

  const changeCategory = (next: string | null) => {
    setFallbackFrom(null);
    setRequestedCategory(next);
  };

  const handleDeleted = (deleted: Product) => {
    const index = visibleProducts.findIndex((p) => p.id === deleted.id);
    const neighbour = visibleProducts[index + 1] ?? visibleProducts[index - 1];
    focusAfterDelete.current = neighbour?.id ?? 'heading';
  };

  // Runs as the delete dialog closes; null keeps the browser default (back to the opener, e.g. on Cancel).
  const deleteFinalFocus = useCallback(() => {
    const target = focusAfterDelete.current;
    focusAfterDelete.current = null;
    if (target === null) return null;
    const nextEdit = target === 'heading' ? null : document.querySelector<HTMLElement>(`[data-edit-id="${target}"]`);
    return nextEdit ?? headingRef.current;
  }, []);

  const summary =
    products && summarize(products.length, visibleProducts.length, categories.length, category, fallbackNotice);

  return (
    <section aria-labelledby="products-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="products-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight focus-visible:outline-none"
          >
            Products
          </h2>
          <p aria-live="polite" className="mt-1 min-h-5 text-sm text-ink-muted">
            {summary}
          </p>
        </div>
        {/* The error panel offers the retry and the empty panel its own Add button, so the header stays quiet. */}
        {!isError && products?.length !== 0 && (
          <Button variant="primary" onClick={() => setFormTarget('new')}>
            <Plus className="-ml-1 size-4" strokeWidth={2.25} aria-hidden="true" />
            Add product
          </Button>
        )}
      </div>

      {products && products.length > 0 && (
        <div className="mt-6">
          <CategoryFilter categories={categories} value={category} onChange={changeCategory} />
        </div>
      )}

      <div className="mt-4">
        {isPending && <LoadingState />}

        {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

        {products &&
          (products.length === 0 ? (
            <EmptyState onAdd={() => setFormTarget('new')} />
          ) : (
            <ProductList
              products={visibleProducts}
              onEdit={setFormTarget}
              onDelete={setDeleteTarget}
            />
          ))}
      </div>

      <ProductFormDialog target={formTarget} categories={categories} onClose={() => setFormTarget(null)} />
      <ConfirmDeleteDialog
        product={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
        finalFocus={deleteFinalFocus}
      />
    </section>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summarize(
  total: number,
  visible: number,
  categoryCount: number,
  category: string | null,
  missingCategory: string | null,
) {
  if (total === 0) return null; // the empty panel says it
  if (missingCategory) return `No products in ${missingCategory}. Showing all categories instead.`;
  if (category) return `${visible} of ${plural(total, 'product', 'products')} in ${category}`;
  return `${plural(total, 'product', 'products')} across ${plural(categoryCount, 'category', 'categories')}`;
}

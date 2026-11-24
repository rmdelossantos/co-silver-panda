import { useMemo, useState } from 'react';
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
  const [formTarget, setFormTarget] = useState<Product | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const categories = useMemo(() => getCategories(products ?? []), [products]);
  const category = resolveCategory(categories, requestedCategory);
  const visibleProducts = useMemo(() => filterByCategory(products ?? [], category), [products, category]);

  return (
    <section aria-labelledby="products-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="products-heading" className="text-lg font-medium">
          Products
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <CategoryFilter categories={categories} value={category} onChange={setRequestedCategory} />
          <button
            type="button"
            onClick={() => setFormTarget('new')}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add product
          </button>
        </div>
      </div>

      {isPending && <LoadingState />}

      {isError && <ErrorState message={error.message} onRetry={() => refetch()} />}

      {products &&
        (products.length === 0 ? (
          <EmptyState onAdd={() => setFormTarget('new')} />
        ) : (
          <ProductList products={visibleProducts} onEdit={setFormTarget} onDelete={setDeleteTarget} />
        ))}

      <ProductFormDialog target={formTarget} categories={categories} onClose={() => setFormTarget(null)} />
      <ConfirmDeleteDialog product={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </section>
  );
}

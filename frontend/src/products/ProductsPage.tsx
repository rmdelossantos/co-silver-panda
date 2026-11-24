import { useMemo, useState } from 'react';
import { useSearchParam } from '../lib/useSearchParam';
import { filterByCategory, getCategories, resolveCategory } from './categories';
import { CategoryFilter } from './CategoryFilter';
import { ProductFormDialog } from './ProductFormDialog';
import { ProductList } from './ProductList';
import type { Product } from './product.types';
import { useProducts } from './useProducts';

export function ProductsPage() {
  const { data: products, isPending, isError, error, refetch } = useProducts();
  const [requestedCategory, setRequestedCategory] = useSearchParam('category');
  const [formTarget, setFormTarget] = useState<Product | 'new' | null>(null);

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

      {isPending && <p className="text-gray-500">Loading products…</p>}

      {isError && (
        <div role="alert" className="space-x-2">
          <span>{error.message}</span>
          <button type="button" className="underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      )}

      {products &&
        (products.length === 0 ? (
          <p className="text-gray-500">No products yet.</p>
        ) : (
          <ProductList products={visibleProducts} />
        ))}

      <ProductFormDialog target={formTarget} categories={categories} onClose={() => setFormTarget(null)} />
    </section>
  );
}

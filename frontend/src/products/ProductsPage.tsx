import { ProductList } from './ProductList';
import { useProducts } from './useProducts';

export function ProductsPage() {
  const { data: products, isPending, isError, error, refetch } = useProducts();

  return (
    <section aria-labelledby="products-heading" className="space-y-4">
      <h2 id="products-heading" className="text-lg font-medium">
        Products
      </h2>

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
          <ProductList products={products} />
        ))}
    </section>
  );
}

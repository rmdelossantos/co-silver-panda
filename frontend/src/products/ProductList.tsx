import { formatPrice } from '../lib/format';
import type { Product } from './product.types';

interface ProductListProps {
  products: Product[];
}

// One table for all widths: rows collapse into stacked cards below the md breakpoint.
export function ProductList({ products }: ProductListProps) {
  return (
    <table className="w-full text-left text-sm max-md:block">
      <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 max-md:sr-only">
        <tr>
          <th scope="col" className="px-4 py-3 font-medium">Name</th>
          <th scope="col" className="px-4 py-3 font-medium">Category</th>
          <th scope="col" className="px-4 py-3 text-right font-medium">Price</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 max-md:block max-md:space-y-3 max-md:divide-y-0">
        {products.map((product) => (
          <tr
            key={product.id}
            className="max-md:grid max-md:grid-cols-[1fr_auto] max-md:gap-1 max-md:rounded-lg max-md:border max-md:border-gray-200 max-md:p-4"
          >
            <td className="px-4 py-3 max-md:p-0">
              <div className="font-medium text-gray-900">{product.name}</div>
              {product.description && <div className="mt-0.5 text-gray-500">{product.description}</div>}
            </td>
            <td className="px-4 py-3 max-md:order-last max-md:col-span-2 max-md:p-0">
              <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {product.category}
              </span>
            </td>
            <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 max-md:p-0">
              {formatPrice(product.price)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

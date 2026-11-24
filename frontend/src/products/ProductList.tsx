import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { formatPrice } from '../lib/format';
import { categoryIndex } from './categories';
import { CategoryBadge } from './CategoryBadge';
import type { Product } from './product.types';

interface ProductListProps {
  products: Product[];
  categories: string[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

// One table for all widths: on md+ it sits in a single panel; below md each row becomes its own card.
export function ProductList({ products, categories, onEdit, onDelete }: ProductListProps) {
  return (
    <div className="md:overflow-hidden md:rounded-xl md:border md:border-line md:bg-surface md:shadow-xs">
      <table className="w-full text-left text-sm max-md:block">
        <thead className="border-b border-line bg-canvas/60 text-xs font-medium text-ink-muted max-md:sr-only">
          <tr>
            <th scope="col" className="py-2.5 pr-4 pl-5 font-medium">
              Product
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Category
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Price
            </th>
            <th scope="col" className="py-2.5 pr-3 pl-4">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line max-md:block max-md:space-y-3 max-md:divide-y-0">
          {products.map((product) => (
            <tr
              key={product.id}
              className="transition-colors md:hover:bg-hover/60 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-2.5 max-md:rounded-xl max-md:border max-md:border-line max-md:bg-surface max-md:p-4 max-md:shadow-xs"
            >
              <td className="py-3.5 pr-4 pl-5 max-md:p-0">
                <div className="font-medium text-ink wrap-anywhere">{product.name}</div>
                {product.description && (
                  <div className="mt-0.5 line-clamp-2 max-w-prose text-ink-muted wrap-anywhere">{product.description}</div>
                )}
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap max-md:col-start-1 max-md:row-start-2 max-md:self-center max-md:p-0">
                <CategoryBadge category={product.category} index={categoryIndex(categories, product.category)} />
              </td>
              <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap tabular-nums text-ink max-md:col-start-2 max-md:row-start-1 max-md:p-0">
                {formatPrice(product.price)}
              </td>
              <td className="py-2 pr-3 pl-4 max-md:col-start-2 max-md:row-start-2 max-md:-my-1.5 max-md:-mr-2 max-md:p-0">
                <div className="flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(product)}
                    aria-label={`Edit ${product.name}`}
                    data-edit-id={product.id}
                    title="Edit"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="danger-ghost"
                    size="icon"
                    onClick={() => onDelete(product)}
                    aria-label={`Delete ${product.name}`}
                    title="Delete"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

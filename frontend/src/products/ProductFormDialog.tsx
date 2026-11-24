import { Dialog } from '../components/Dialog';
import { ProductForm } from './ProductForm';
import type { Product, ProductInput } from './product.types';
import { useCreateProduct, useUpdateProduct } from './useProducts';

interface ProductFormDialogProps {
  // 'new' opens an empty form; a product opens it prefilled for editing; null closes it.
  target: Product | 'new' | null;
  categories: string[];
  onClose: () => void;
}

export function ProductFormDialog({ target, categories, onClose }: ProductFormDialogProps) {
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const product = target === 'new' ? undefined : (target ?? undefined);

  const save = async (input: ProductInput) => {
    if (product) await updateProduct.mutateAsync({ id: product.id, input });
    else await createProduct.mutateAsync(input);
    onClose();
  };

  return (
    <Dialog open={target !== null} title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
      <ProductForm
        key={product?.id ?? 'new'}
        product={product}
        categories={categories}
        submitLabel={product ? 'Save changes' : 'Add product'}
        onSubmit={save}
        onCancel={onClose}
      />
    </Dialog>
  );
}

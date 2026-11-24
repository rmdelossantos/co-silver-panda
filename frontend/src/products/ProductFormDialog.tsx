import { useRef } from 'react';
import { toast } from 'sonner';
import { Dialog } from '../components/Dialog';
import { ProductForm, type ProductFormHandle } from './ProductForm';
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
  const formRef = useRef<ProductFormHandle>(null);

  const save = async (input: ProductInput) => {
    if (product) {
      const updated = await updateProduct.mutateAsync({ id: product.id, input });
      toast.success(`Saved changes to “${updated.name}”`);
    } else {
      const created = await createProduct.mutateAsync(input);
      toast.success(`Added “${created.name}”`);
    }
    onClose();
  };

  return (
    <Dialog
      open={target !== null}
      title={product ? 'Edit product' : 'Add product'}
      onClose={() => formRef.current?.requestClose()}
      onForcedClose={onClose}
    >
      <ProductForm
        key={product?.id ?? 'new'}
        ref={formRef}
        product={product}
        categories={categories}
        submitLabel={product ? 'Save changes' : 'Add product'}
        onSubmit={save}
        onCancel={onClose}
      />
    </Dialog>
  );
}

import { toast } from 'sonner';
import { Dialog } from '../components/Dialog';
import { ApiError } from '../lib/api-client';
import type { Product } from './product.types';
import { useDeleteProduct } from './useProducts';

interface ConfirmDeleteDialogProps {
  product: Product | null;
  onClose: () => void;
}

export function ConfirmDeleteDialog({ product, onClose }: ConfirmDeleteDialogProps) {
  const deleteProduct = useDeleteProduct();

  const close = () => {
    deleteProduct.reset();
    onClose();
  };

  const confirm = async () => {
    if (!product) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success(`Deleted “${product.name}”`);
    } catch (error) {
      // Already gone (e.g. deleted in another tab) counts as done.
      if (!(error instanceof ApiError && error.status === 404)) return;
      toast.info(`“${product.name}” was already deleted`);
    }
    close();
  };

  return (
    <Dialog open={product !== null} title="Delete product?" onClose={close}>
      <p className="text-sm text-gray-600">
        <strong className="font-medium text-gray-900">{product?.name}</strong> will be permanently removed from the
        catalog.
      </p>

      {deleteProduct.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {deleteProduct.error.message}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={close} className="rounded-md px-4 py-2 text-sm hover:bg-gray-100">
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={deleteProduct.isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {deleteProduct.isPending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Dialog>
  );
}

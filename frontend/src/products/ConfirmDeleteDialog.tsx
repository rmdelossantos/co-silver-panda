import { toast } from 'sonner';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { ApiError } from '../lib/api-client';
import type { Product } from './product.types';
import { useDeleteProduct } from './useProducts';

interface ConfirmDeleteDialogProps {
  product: Product | null;
  onClose: () => void;
  // Called once the product is gone (deleted now or already), before the dialog closes.
  onDeleted: (product: Product) => void;
  finalFocus?: () => HTMLElement | null;
}

export function ConfirmDeleteDialog({ product, onClose, onDeleted, finalFocus }: ConfirmDeleteDialogProps) {
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
    onDeleted(product);
    close();
  };

  return (
    <Dialog open={product !== null} title="Delete product?" onClose={close} finalFocus={finalFocus}>
      <p className="text-sm text-ink-muted">
        <strong className="font-medium text-ink wrap-anywhere">{product?.name}</strong> will be permanently removed from the
        catalog. This can’t be undone.
      </p>

      {deleteProduct.isError && (
        <div role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <p className="font-medium">The product wasn’t deleted.</p>
          <p className="mt-0.5">{deleteProduct.error.message}</p>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={close} data-autofocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} disabled={deleteProduct.isPending}>
          {deleteProduct.isPending ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </Dialog>
  );
}

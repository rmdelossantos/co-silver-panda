import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProductInput } from './product.types';
import { productsApi } from './products.api';

export const productKeys = {
  all: ['products'] as const,
};

export function useProducts() {
  return useQuery({ queryKey: productKeys.all, queryFn: productsApi.list });
}

// Mutations refetch the list from the server instead of patching the cache optimistically.
function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all });
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({ mutationFn: productsApi.create, onSuccess: invalidate });
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProductInput }) => productsApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateProducts();
  return useMutation({ mutationFn: productsApi.remove, onSettled: invalidate });
}

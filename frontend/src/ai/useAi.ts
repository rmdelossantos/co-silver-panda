import { useMutation, useQuery } from '@tanstack/react-query';
import { aiApi } from './ai.api';

// Whether the server has AI configured. It doesn't change while the app runs, and any failure simply
// means the feature stays hidden.
export function useAiStatus() {
  const query = useQuery({ queryKey: ['ai-status'], queryFn: aiApi.status, staleTime: Infinity, retry: false });
  return { enabled: query.data?.enabled === true, isResolved: !query.isPending };
}

export function useDraftProduct() {
  return useMutation({ mutationFn: aiApi.draftProduct });
}

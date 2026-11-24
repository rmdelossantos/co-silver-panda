import { apiRequest } from '../lib/api-client';
import type { AiStatus, DraftRequest, DraftResult } from './ai.types';

export const aiApi = {
  status: () => apiRequest<AiStatus>('/api/ai/status'),
  draftProduct: (input: DraftRequest) =>
    apiRequest<DraftResult>('/api/ai/product-draft', { method: 'POST', body: JSON.stringify(input) }),
};

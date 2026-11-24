export interface AiStatus {
  enabled: boolean;
}

export interface DraftRequest {
  name: string;
  category: string;
  description: string;
  productId?: number;
}

export interface DraftResult {
  description: string;
  category: string;
  categoryIsNew: boolean;
  sources: { id: number; name: string; category: string }[];
}

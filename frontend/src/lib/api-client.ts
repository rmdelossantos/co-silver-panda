export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: FieldError[];

  constructor(status: number, message: string, details: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface ErrorBody {
  error?: { message?: string; details?: FieldError[] };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Resolve against the page origin: same-origin in prod, proxied by Vite in dev.
  const url = new URL(path, window.location.origin);
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return undefined as T;

  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const error = (body as ErrorBody | undefined)?.error;
    throw new ApiError(res.status, error?.message ?? `Request failed (${res.status})`, error?.details);
  }
  return body as T;
}

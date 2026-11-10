import type { ApiErrorCode, Horizon, Prediction, Signals } from './types';

// Backend address. Set VITE_API_URL in .env.local to override.
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError('NETWORK_ERROR', 'Backend is not reachable.');
  }

  if (!response.ok) {
    // Backend errors look like {"detail": {"code": "...", "message": "..."}}
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    if (detail && typeof detail === 'object' && 'code' in detail) {
      throw new ApiError(detail.code, detail.message, response.status);
    }
    throw new ApiError('UNKNOWN_ERROR', `Request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}

export function getSignals(symbol: string, minConfidence: number, signal?: AbortSignal): Promise<Signals> {
  const query = new URLSearchParams({ min_confidence: String(minConfidence) });
  return getJson<Signals>(`/signals/${encodeURIComponent(symbol)}?${query}`, signal);
}

export function getPrediction(symbol: string, horizon: Horizon, signal?: AbortSignal): Promise<Prediction> {
  const query = new URLSearchParams({ horizon });
  return getJson<Prediction>(`/predictions/${encodeURIComponent(symbol)}?${query}`, signal);
}

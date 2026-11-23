import { API_URL } from './client';

export type OperationAction = 'status' | 'train_direction' | 'walk_forward' | 'regime_report' | 'train_barrier' | 'train_state_barrier' | 'train_meta_label' | 'train_volatility';
export type FeatureSet = 'v1' | 'v2_funding_basis' | 'v3_open_interest' | string;
export type OperationHorizon = '1h' | '4h' | '24h' | '7d';

export interface OperationJob {
  job_id: string;
  action: OperationAction;
  horizon: OperationHorizon;
  feature_set: FeatureSet;
  barrier_config?: string | null;
  barrier_feature_set?: string | null;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  finished_at: string | null;
  output: string;
  return_code: number | null;
}

export interface OperationOptions {
  featureSet?: FeatureSet;
  barrierFeatureSet?: 'candles' | 'all_data' | 'all';
  startDate?: string;
  excludeRecentDays?: number;
}

export function tokenHeader(token: string): Record<string, string> {
  const bytes = new TextEncoder().encode(token);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return { 'X-Operations-Token-B64': btoa(binary) };
}

/** The job log is protected by the operations token on the backend. */
export async function getOperationStatus(token: string, signal?: AbortSignal): Promise<OperationJob[]> {
  const response = await fetch(`${API_URL}/operations/status`, { headers: tokenHeader(token), signal });
  if (!response.ok) throw new Error((await response.text()) || `Status failed (${response.status})`);
  return response.json() as Promise<OperationJob[]>;
}

export async function startOperation(action: OperationAction, horizon: OperationHorizon, token: string, options: OperationOptions = {}): Promise<OperationJob> {
  const response = await fetch(`${API_URL}/operations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader(token) },
    body: JSON.stringify({
      action,
      horizon,
      feature_set: options.featureSet ?? 'v1',
      barrier_feature_set: options.barrierFeatureSet ?? 'all',
      start_date: options.startDate || null,
      exclude_recent_days: options.excludeRecentDays ?? 0,
    }),
  });
  if (!response.ok) throw new Error((await response.text()) || `Operation failed (${response.status})`);
  return response.json() as Promise<OperationJob>;
}

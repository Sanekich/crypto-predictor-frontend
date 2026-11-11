import { getJsonForMonitoring, API_URL } from './client';

export type OperationAction = 'status' | 'train_direction' | 'walk_forward' | 'regime_report';

export interface OperationJob {
  job_id: string;
  action: OperationAction;
  horizon: '24h' | '7d';
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  finished_at: string | null;
  output: string;
  return_code: number | null;
}

export function getOperationStatus(signal?: AbortSignal): Promise<OperationJob[]> {
  return getJsonForMonitoring<OperationJob[]>('/operations/status', signal);
}

export async function startOperation(action: OperationAction, horizon: '24h' | '7d', token: string): Promise<OperationJob> {
  const bytes = new TextEncoder().encode(token);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  const response = await fetch(`${API_URL}/operations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Operations-Token-B64': btoa(binary) },
    body: JSON.stringify({ action, horizon }),
  });
  if (!response.ok) throw new Error((await response.text()) || `Operation failed (${response.status})`);
  return response.json() as Promise<OperationJob>;
}

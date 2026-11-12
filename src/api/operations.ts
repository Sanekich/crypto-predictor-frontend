import { API_URL } from './client';

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

function tokenHeader(token: string): Record<string, string> {
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

export async function deleteOldModel(modelId: string, token: string): Promise<void> {
  const bytes = new TextEncoder().encode(token);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  const response = await fetch(`${API_URL}/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
    headers: { 'X-Operations-Token-B64': btoa(binary) },
  });
  if (!response.ok) throw new Error((await response.text()) || `Delete failed (${response.status})`);
}

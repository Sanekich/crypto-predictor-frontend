import { API_URL, getJsonForMonitoring } from './client';

export interface ModelHistoryEntry {
  model_id: string;
  source: 'base' | 'barrier' | 'experiment';
  archived: boolean;
  model_type: string;
  symbol?: string;
  interval?: string;
  horizon?: string;
  feature_set?: string;
  status?: string;
  trained_at?: string;
  archived_at?: string;
  archive_reason?: string;
  accuracy?: number;
  baseline_accuracy?: number;
  brier?: number;
  brier_skill?: number;
  positive_folds?: number;
  folds?: number;
  independent_signals?: number;
}

export interface ModelHistoryResponse {
  active: ModelHistoryEntry[];
  archived: ModelHistoryEntry[];
}

export async function getModelHistory(signal?: AbortSignal): Promise<ModelHistoryResponse> {
  return getJsonForMonitoring<ModelHistoryResponse>('/model-history', signal);
}

export async function archiveModel(model_id: string, source: ModelHistoryEntry['source'], reason: string, token: string): Promise<ModelHistoryEntry> {
  const bytes = new TextEncoder().encode(token);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  const response = await fetch(`${API_URL}/model-history/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Operations-Token-B64': btoa(binary) },
    body: JSON.stringify({ model_id, source, reason }),
  });
  if (!response.ok) throw new Error((await response.text()) || `Archive failed (${response.status})`);
  return response.json() as Promise<ModelHistoryEntry>;
}

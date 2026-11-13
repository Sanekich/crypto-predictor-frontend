import { API_URL, getJsonForMonitoring } from './client';
import { tokenHeader, type OperationJob } from './operations';

// Mirrors app/api/routes/barrier.py (new logic: "which comes first, +X% or -X%?").

export interface BarrierSignalStats {
  signals: number;
  independent_signals: number;
  independent_resolved: number;
  independent_hits: number;
  independent_hit_rate: number | null;
  hit_rate_lower_95: number | null;
  independent_none: number;
  unresolved_share: number | null;
}

export interface BarrierPeriod {
  fold: number;
  test_start: string;
  test_end: string;
  accuracy: number | null;
  brier_skill: number | null;
  max_confidence: number | null;
  signals: BarrierSignalStats | null;
}

export interface BarrierGate {
  passed: boolean;
  reasons: string[];
  progress?: { independent_signals: number; hit_rate: number | null; hit_rate_lower_95: number | null };
}

export interface BarrierModel {
  model_id: string;
  trained_at: string;
  status: 'approved' | 'shadow' | string;
  symbol: string;
  interval: string;
  config_key: string;
  config_label: string;
  threshold: number;
  max_horizon: string;
  feature_set: string;
  feature_set_label: string;
  variant: string;
  feature_count: number;
  rows: number | null;
  labeled_rows: number | null;
  first_timestamp: string | null;
  last_timestamp: string | null;
  outcome_shares: Record<string, number> | null;
  test: {
    period_start: string | null;
    period_end: string | null;
    accuracy: number | null;
    majority_baseline_accuracy: number | null;
    base_rate_up: number | null;
    max_confidence: number | null;
    resolved_share: number | null;
    brier_skill: number | null;
    signals: BarrierSignalStats | null;
  };
  walk_forward: {
    folds: number | null;
    brier_skill_by_fold: number[] | null;
    brier_skill_mean: number | null;
    positive_folds: number | null;
    has_skill: boolean | null;
    accuracy_by_fold: (number | null)[] | null;
    max_confidence: number | null;
    resolved_share: number | null;
    periods: BarrierPeriod[];
  };
  signals: BarrierSignalStats | null;
  signals_by_threshold: Record<string, BarrierSignalStats | null>;
  gate: BarrierGate | null;
  is_latest: boolean;
}

export interface BarrierConfig {
  key: string;
  threshold: number;
  max_horizon: string;
  label: string;
}

export interface BarrierOverview {
  logic: { name: string; question: string; signal_threshold: number; artifacts_dir: string };
  configs: BarrierConfig[];
  feature_sets: { key: string; label: string; derivatives: string[] }[];
  criteria: {
    gate: { min_independent_signals: number; min_hit_rate: number; min_hit_rate_lower_95: number };
    skill_gate: { folds: number; min_positive_folds: number };
  };
  models: BarrierModel[];
}

export function getBarrierOverview(signal?: AbortSignal): Promise<BarrierOverview> {
  return getJsonForMonitoring<BarrierOverview>('/barrier/overview', signal);
}

export async function startBarrierTraining(token: string, config: string, featureSet: string): Promise<OperationJob> {
  const response = await fetch(`${API_URL}/operations/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...tokenHeader(token) },
    body: JSON.stringify({ action: 'train_barrier', barrier_config: config, barrier_feature_set: featureSet }),
  });
  if (!response.ok) throw new Error((await response.text()) || `Operation failed (${response.status})`);
  return response.json() as Promise<OperationJob>;
}

export async function deleteBarrierModel(modelId: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/barrier/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
    headers: tokenHeader(token),
  });
  if (!response.ok) throw new Error((await response.text()) || `Delete failed (${response.status})`);
}

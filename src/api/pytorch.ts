import { getJsonForMonitoring } from './client';

export interface PytorchSignal {
  threshold: number;
  signals: number | null;
  independent_signals: number | null;
  independent_resolved: number | null;
  independent_hits: number | null;
  independent_hit_rate: number | null;
  hit_rate_lower_95: number | null;
  independent_none: number | null;
}

export interface PytorchWindow {
  fold: number;
  rows: number | null;
  test_start: string | null;
  test_end: string | null;
  accuracy: number | null;
  brier_skill: number | null;
  max_confidence: number | null;
  resolved_share: number | null;
}

export interface PytorchBarrierModel {
  model_id: string;
  model_type: string;
  trained_at: string;
  status: string;
  logic: string;
  config_label: string;
  feature_set_label: string;
  feature_count: number;
  sequence_length: number | null;
  accuracy: number | null;
  majority_baseline_accuracy: number | null;
  brier_skill: number | null;
  resolved_share: number | null;
  max_confidence: number | null;
  independent_resolved: number | null;
  independent_hit_rate: number | null;
  hit_rate_lower_95: number | null;
  signals: PytorchSignal[];
  windows: PytorchWindow[];
  window_summary: { folds: number; positive_folds: number; mean_brier_skill: number | null };
}

export interface PytorchExperimentOverview {
  target: string;
  feature_set: string;
  pytorch: PytorchBarrierModel | null;
  xgboost: PytorchBarrierModel | null;
}

export function getPytorchExperimentOverview(signal?: AbortSignal): Promise<PytorchExperimentOverview> {
  return getJsonForMonitoring<PytorchExperimentOverview>('/pytorch/overview', signal);
}

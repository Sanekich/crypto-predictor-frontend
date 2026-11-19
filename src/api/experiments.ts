import { getJsonForMonitoring } from './client';

export interface ExperimentalModelCard {
  model_id: string;
  model_type: string;
  trained_at: string;
  status: string;
  logic: string;
  barrier_label: string;
  feature_set: string;
  feature_set_label: string;
  feature_count: number;
  rows: number | null;
  first_timestamp: string | null;
  last_timestamp: string | null;
  accuracy: number | null;
  baseline_accuracy: number | null;
  brier_skill: number | null;
  max_confidence: number | null;
  independent_resolved: number | null;
  independent_hit_rate: number | null;
  hit_rate_lower_95: number | null;
  folds: number;
  positive_folds: number;
  mean_brier_skill: number | null;
}

export interface ExperimentalOverview {
  models: ExperimentalModelCard[];
  latest: ExperimentalModelCard | null;
}

export function getExperimentalOverview(signal?: AbortSignal): Promise<ExperimentalOverview> {
  return getJsonForMonitoring<ExperimentalOverview>('/experiments/overview', signal);
}

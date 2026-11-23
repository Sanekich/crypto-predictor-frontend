import { getJsonForMonitoring } from './client';

// Mirrors app/api/routes/volatility.py: "will the price move by at least X% (either way) within N hours?"

export interface VolatilitySignalStats {
  threshold: number;
  signals: number;
  independent_signals: number;
  independent_hits: number;
  independent_hit_rate: number | null;
  hit_rate_lower_95: number | null;
}

export interface VolatilityForecast {
  available: boolean;
  reason?: string;
  as_of?: string;
  target_time?: string;
  p_move?: number;
  price?: number;
  upper_price?: number;
  lower_price?: number;
  signal?: 'move' | 'calm' | null;
}

export interface VolatilityModel {
  model_id: string;
  trained_at: string;
  status: string;
  config: { key: string; threshold: number; horizon: string; label: string };
  feature_set: string;
  feature_set_label: string;
  variant: string;
  dataset: { rows: number; move_share: number | null; first_timestamp: string | null; last_timestamp: string | null } | null;
  walk_forward: {
    folds: number | null;
    brier_skill_by_fold: number[] | null;
    brier_skill_mean: number | null;
    baseline_brier_skill_mean: number | null;
    auc_by_fold: (number | null)[] | null;
    positive_folds: number | null;
    has_skill: boolean | null;
    beats_baseline: boolean | null;
  };
  test: { accuracy: number | null; majority_baseline_accuracy: number | null; move_share: number | null; brier_skill: number | null; auc: number | null };
  move_signals: Record<string, VolatilitySignalStats | null>;
  calm_signals: Record<string, VolatilitySignalStats | null>;
  gate: { passed: boolean; reasons: string[]; signal_kind?: string } | null;
  forecast: VolatilityForecast | null;
}

export interface VolatilityOverview {
  question: string;
  signal_threshold: number;
  configs: { key: string; threshold: number; horizon: string; label: string }[];
  feature_sets: { key: string; label: string }[];
  criteria: { gate: { min_independent_signals: number; min_hit_rate: number; min_hit_rate_lower_95: number }; skill_gate: { folds: number; min_positive_folds: number } };
  models: VolatilityModel[];
}

export function getVolatilityOverview(signal?: AbortSignal): Promise<VolatilityOverview> {
  return getJsonForMonitoring<VolatilityOverview>('/volatility/overview', signal);
}

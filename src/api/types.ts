// Mirrors the backend schemas (app/schemas/prediction.py).
// Full description: http://127.0.0.1:8000/docs

export type Horizon = '24h' | '7d';

export interface PriceRange {
  probability: number;
  lower_quantile: number;
  upper_quantile: number;
  lower_return: number;
  upper_return: number;
  lower_price: number;
  upper_price: number;
}

export type DirectionReason = 'NO_SIGNAL' | 'NO_MODEL' | 'NOT_CALIBRATED';

export interface DirectionForecast {
  available: boolean;
  up_probability: number | null;
  reason: DirectionReason | null;
}

export interface ModelQuality {
  test_period_start: string;
  test_period_end: string;
  nominal_coverage: number;
  test_coverage: number;
  improvement_vs_baseline: number;
}

export interface Prediction {
  symbol: string;
  timeframe: string;
  horizon: string;
  generated_at: string;
  data_as_of: string;
  target_time: string;
  model_version: string;
  current_price: number;
  median_return: number;
  median_price: number;
  range: PriceRange;
  direction: DirectionForecast;
  quality: ModelQuality;
  disclaimer: string;
}

export type ApiErrorCode =
  | 'MODEL_NOT_AVAILABLE'
  | 'DATA_NOT_AVAILABLE'
  | 'DATA_STALE'
  | 'MODEL_INCOMPATIBLE'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

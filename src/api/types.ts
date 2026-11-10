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

// --- Short-horizon direction signals (GET /signals/{symbol}) ---

export interface SignalModelQuality {
  test_period_start: string;
  test_period_end: string;
  test_accuracy: number;
  always_up_accuracy: number;
  max_confidence: number;
  signals_at_threshold: number;
  hit_rate: number | null;
  hit_rate_lower_95: number | null;
}

export interface HorizonSignal {
  horizon: string;
  model_version: string;
  status: 'approved' | 'shadow';
  status_reasons: string[];
  p_up: number;
  direction: 'up' | 'down';
  confidence: number;
  is_signal: boolean;
  target_time: string;
  quality: SignalModelQuality;
}

export interface JournalEntry {
  horizon: string;
  signal_time: string;
  target_time: string;
  direction: 'up' | 'down';
  confidence: number;
  price_at_signal: number;
  outcome_price: number | null;
  correct: boolean | null;
  model_status: string;
}

export interface Signals {
  symbol: string;
  generated_at: string;
  data_as_of: string;
  threshold: number;
  horizons: HorizonSignal[];
  history: JournalEntry[];
  live: { signals: number; resolved: number; correct: number; hit_rate: number | null };
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

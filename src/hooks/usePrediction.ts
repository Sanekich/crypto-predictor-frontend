import { getPrediction } from '../api/client';
import type { Horizon, Prediction } from '../api/types';
import { usePolling, type RemoteState } from './usePolling';

// Candles are hourly, so a new forecast appears at most once an hour.
const REFRESH_MS = 5 * 60_000;

export type PredictionState = RemoteState<Prediction>;

export function usePrediction(symbol: string, horizon: Horizon): PredictionState {
  return usePolling((signal) => getPrediction(symbol, horizon, signal), REFRESH_MS, [symbol, horizon]);
}

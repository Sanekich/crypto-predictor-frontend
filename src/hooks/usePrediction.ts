import { useEffect, useState } from 'react';
import { ApiError, getPrediction } from '../api/client';
import type { Horizon, Prediction } from '../api/types';

// Candles are hourly, so a new forecast appears at most once an hour.
const REFRESH_MS = 5 * 60_000;

export type PredictionState =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: Prediction; error: null }
  | { status: 'error'; data: Prediction | null; error: ApiError };

export function usePrediction(symbol: string, horizon: Horizon): PredictionState {
  const [state, setState] = useState<PredictionState>({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let controller = new AbortController();

    const load = async () => {
      controller.abort();
      controller = new AbortController();
      try {
        const data = await getPrediction(symbol, horizon, controller.signal);
        setState({ status: 'success', data, error: null });
      } catch (err) {
        if (controller.signal.aborted) return;
        const error = err instanceof ApiError ? err : new ApiError('UNKNOWN_ERROR', String(err));
        // Keep the last good forecast visible if a refresh fails
        setState((previous) => ({ status: 'error', data: previous.data, error }));
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [symbol, horizon]);

  return state;
}

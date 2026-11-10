import { getSignals } from '../api/client';
import type { Signals } from '../api/types';
import { usePolling, type RemoteState } from './usePolling';

// Hourly candles: a new probability appears once an hour; poll a bit more often
const REFRESH_MS = 60_000;

export const SIGNAL_THRESHOLD = 0.75;

export function useSignals(symbol: string, minConfidence = SIGNAL_THRESHOLD): RemoteState<Signals> {
  return usePolling((signal) => getSignals(symbol, minConfidence, signal), REFRESH_MS, [symbol, minConfidence]);
}

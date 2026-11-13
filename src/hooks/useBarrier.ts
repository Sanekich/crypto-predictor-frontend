import { getBarrierOverview, type BarrierOverview } from '../api/barrier';
import { usePolling, type RemoteState } from './usePolling';

const REFRESH_MS = 60_000;

/** New-logic models overview; `version` forces a reload (e.g. after a training job finished). */
export function useBarrier(version = 0): RemoteState<BarrierOverview> {
  return usePolling((signal) => getBarrierOverview(signal), REFRESH_MS, [version]);
}

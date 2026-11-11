import { getMonitoringSnapshot, type MonitoringSnapshot } from '../api/monitoring';
import { usePolling, type RemoteState } from './usePolling';

const REFRESH_MS = 60_000;

export function useMonitoring(symbol: string): RemoteState<MonitoringSnapshot> {
  return usePolling((signal) => getMonitoringSnapshot(symbol, signal), REFRESH_MS, [symbol]);
}

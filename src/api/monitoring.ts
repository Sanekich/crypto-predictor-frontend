import { getJsonForMonitoring } from './client';

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface LiveConnection {
  connected?: boolean;
  messages?: number;
  last_message_at?: string | null;
}

export interface LiveStatus {
  updated_at?: string;
  connections?: Record<string, LiveConnection>;
  parse_errors?: number;
  rows_written?: number;
  messages?: number;
  [key: string]: unknown;
}

export interface DataStatus {
  rows: number;
  first_timestamp?: string | null;
  last_timestamp?: string | null;
  is_valid: boolean;
  gap_count: number;
  missing_candles: number;
  errors: string[];
}

export interface ModelSummary {
  model_id: string;
  model_type: string;
  symbol: string;
  interval: string;
  horizon: string;
  trained_at: string;
  status?: 'approved' | 'shadow' | string;
}

export interface MonitoringSnapshot {
  health: HealthStatus;
  live: LiveStatus;
  data: DataStatus;
  models: ModelSummary[];
}

export async function getMonitoringSnapshot(symbol: string, signal?: AbortSignal): Promise<MonitoringSnapshot> {
  const [health, live, data, models] = await Promise.all([
    getJsonForMonitoring<HealthStatus>('/health', signal),
    getJsonForMonitoring<LiveStatus>(`/live/status/${encodeURIComponent(symbol)}`, signal),
    getJsonForMonitoring<DataStatus>(`/data/status/${encodeURIComponent(symbol)}?interval=1h`, signal),
    getJsonForMonitoring<ModelSummary[]>('/models', signal),
  ]);
  return { health, live, data, models };
}

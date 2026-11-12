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
  rows_written?: number | Record<string, number>;
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

export interface TrainingStage {
  stage: number;
  label: string;
  description: string;
  datasets: string[];
  files: number;
  coverage_hours: number;
  ready: boolean;
  state: 'completed' | 'current' | 'ready_to_test' | 'collecting';
}

export interface TrainingStageStatus {
  current_stage: number;
  current_label: string;
  next_stage: number | null;
  next_ready: boolean;
  recommendation: string;
  stages: TrainingStage[];
}

export interface ModelSummary {
  model_id: string;
  model_type: string;
  symbol: string;
  interval: string;
  horizon: string;
  trained_at: string;
  status?: 'approved' | 'shadow' | string;
  is_latest?: boolean;
}

export interface MonitoringSnapshot {
  health: HealthStatus;
  live: LiveStatus | null;
  liveError?: string;
  data: DataStatus;
  training: TrainingStageStatus;
  models: ModelSummary[];
}

export async function getMonitoringSnapshot(symbol: string, signal?: AbortSignal): Promise<MonitoringSnapshot> {
  const [health, data, training, models] = await Promise.all([
    getJsonForMonitoring<HealthStatus>('/health', signal),
    getJsonForMonitoring<DataStatus>(`/data/status/${encodeURIComponent(symbol)}?interval=1h`, signal),
    getJsonForMonitoring<TrainingStageStatus>(`/training/stage/${encodeURIComponent(symbol)}`, signal),
    getJsonForMonitoring<ModelSummary[]>('/models', signal),
  ]);
  try {
    const live = await getJsonForMonitoring<LiveStatus>(`/live/status/${encodeURIComponent(symbol)}`, signal);
    return { health, live, data, training, models };
  } catch (error) {
    return { health, live: null, liveError: error instanceof Error ? error.message : 'Live collector is unavailable', data, training, models };
  }
}

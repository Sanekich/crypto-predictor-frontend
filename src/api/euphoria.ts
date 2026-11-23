import { getJsonForMonitoring } from './client';

// Mirrors app/api/routes/euphoria.py

export type EuphoriaZone = 'strong_euphoria' | 'euphoria' | 'neutral' | 'panic' | 'strong_panic';

export interface EuphoriaComponent { key: string; label: string; raw: number; z: number }

export interface EuphoriaStudyRow {
  zone: 'euphoria' | 'panic';
  expected: 'up' | 'down';
  threshold: number;
  horizon: string;
  events: number;
  hits: number;
  hit_rate: number | null;
  hit_rate_lower_95: number | null;
  mean_return: number | null;
  base_rate: number | null;
  edge_vs_base: number | null;
  positive_years: number;
  years: number;
  passes_gate: boolean;
}

export interface EuphoriaOverview {
  question: string;
  thresholds: { euphoria: number; strong: number };
  components: { key: string; label: string }[];
  current: {
    as_of: string;
    age_hours: number;
    value: number;
    zone: EuphoriaZone;
    price: number;
    components: EuphoriaComponent[];
  } | null;
  history: { date: string; value: number; price: number }[];
  study: {
    created_at: string;
    period: { start: string | null; end: string | null };
    gate: { min_independent_signals: number; min_hit_rate: number; min_hit_rate_lower_95: number };
    results: EuphoriaStudyRow[];
    best: EuphoriaStudyRow[];
  } | null;
}

export function getEuphoriaOverview(signal?: AbortSignal): Promise<EuphoriaOverview> {
  return getJsonForMonitoring<EuphoriaOverview>('/euphoria/overview', signal);
}

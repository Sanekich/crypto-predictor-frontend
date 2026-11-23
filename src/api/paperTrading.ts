import { API_URL, getJsonForMonitoring } from './client';
import { tokenHeader } from './operations';

// Mirrors app/api/routes/paper_trading.py and app/services/paper_strategies.py (virtual only).

export interface PaperModel {
  model_id: string;
  model_type: string;
  status: string;
  trained_at: string | null;
  symbol: string;
  interval: string;
  horizon: string;
  feature_set_label: string;
  logic: string;
  paper_enabled: boolean;
  promising: boolean;
  promise_reason: string;
  forecast?: PaperForecast | null;
  wallet?: PaperWallet;
}

export interface PaperForecast { horizon: string; direction: 'up' | 'down'; p_up: number; confidence: number; is_signal: boolean; has_skill: boolean; target_time: string; status: string; }

export interface PaperPosition {
  model_id?: string;
  side: 'long' | 'short';
  notional: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  opened_at: string;
}

export interface PaperWallet {
  initial_balance: number;
  cash: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  return_pct: number;
  position: PaperPosition | null;
  trades: PaperTrade[];
}

export interface PaperTrade {
  model_id: string;
  side: 'long' | 'short';
  notional: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  opened_at: string;
  closed_at: string;
}

export interface StrategyTrade {
  side: 'long' | 'short';
  notional: number;
  entry_price: number;
  exit_price: number;
  opened_at: string;
  closed_at: string;
  expires_at: string;
  pnl: number;
  return_pct: number;
  correct: boolean;
  signal: { as_of: string; confidence?: number; p_up?: number; p_move?: number | null; euphoria?: number };
}

export interface StrategyPosition {
  side: 'long' | 'short';
  notional: number;
  entry_price: number;
  opened_at: string;
  expires_at: string;
  current_price: number;
  unrealized_pnl: number;
  signal: StrategyTrade['signal'];
}

export interface PaperStrategy {
  id: string;
  label: string;
  description: string;
  kind: 'direction' | 'panic';
  horizon_hours: number;
  initial_balance: number;
  equity: number;
  return_pct: number;
  trades_count: number;
  wins: number;
  win_rate: number | null;
  win_rate_lower_95: number | null;
  avg_trade_return: number | null;
  fees_paid: number;
  position: StrategyPosition | null;
  recent_trades: StrategyTrade[];
}

export interface PaperController { enabled: boolean; last_tick: string | null; last_action: string; threshold: number; }

export interface PaperOverview {
  initial_balance: number;
  cash: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  return_pct: number;
  current_price: number;
  models: PaperModel[];
  strategies: PaperStrategy[];
  controller: PaperController;
  virtual_only: boolean;
}

export function getPaperOverview(signal?: AbortSignal): Promise<PaperOverview> {
  return getJsonForMonitoring<PaperOverview>('/paper-trading/overview', signal);
}

async function paperAction<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? tokenHeader(token) : {}) };
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error((await response.text()) || `Paper trading failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function openPaperTrade(modelId: string, side: 'long' | 'short', notional: number): Promise<PaperOverview> {
  return paperAction<PaperOverview>('/paper-trading/trade', { model_id: modelId, side, notional });
}

export function closePaperTrade(modelId: string): Promise<PaperOverview> {
  return paperAction<PaperOverview>(`/paper-trading/close/${encodeURIComponent(modelId)}`);
}

export function resetPaperPortfolio(token: string): Promise<{ status: string; balance_per_model: string }> {
  return paperAction<{ status: string; balance_per_model: string }>('/paper-trading/reset', undefined, token);
}

export function setPaperController(enabled: boolean, token: string): Promise<PaperController> {
  return paperAction<PaperController>('/paper-trading/controller', { enabled }, token);
}

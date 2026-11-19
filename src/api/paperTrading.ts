import { API_URL, getJsonForMonitoring } from './client';
import { tokenHeader } from './operations';

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
  wallet: PaperWallet;
}

export interface PaperPosition {
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

export interface PaperOverview {
  initial_balance: number;
  cash: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  return_pct: number;
  current_price: number;
  models: PaperModel[];
  virtual_only: boolean;
}

export function getPaperOverview(signal?: AbortSignal): Promise<PaperOverview> {
  return getJsonForMonitoring<PaperOverview>('/paper-trading/overview', signal);
}

async function paperAction<T>(path: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...tokenHeader(token) }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error((await response.text()) || `Paper trading failed (${response.status})`);
  return response.json() as Promise<T>;
}

export function openPaperTrade(modelId: string, side: 'long' | 'short', notional: number, token: string): Promise<PaperOverview> {
  return paperAction<PaperOverview>('/paper-trading/trade', token, { model_id: modelId, side, notional });
}

export function closePaperTrade(modelId: string, token: string): Promise<PaperOverview> {
  return paperAction<PaperOverview>(`/paper-trading/close/${encodeURIComponent(modelId)}`, token);
}

export function resetPaperPortfolio(token: string): Promise<{ status: string; balance_per_model: string }> {
  return paperAction<{ status: string; balance_per_model: string }>('/paper-trading/reset', token);
}

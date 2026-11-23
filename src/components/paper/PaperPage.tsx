import { useEffect, useState } from 'react';
import {
  closePaperTrade,
  getPaperOverview,
  openPaperTrade,
  resetPaperPortfolio,
  setPaperController,
  type PaperModel,
  type PaperOverview,
  type PaperStrategy,
  type PaperWallet,
} from '../../api/paperTrading';
import { formatDateTime, formatPrice } from '../../utils/format';
import '../monitoring/monitoring.css';
import './paper.css';

const pct1 = new Intl.NumberFormat('ru-RU', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const share = (value: number | null | undefined) => (value == null ? '—' : pct1.format(value));
const signedPct = (value: number | null | undefined) => (value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`);
const money = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

/** Forward test: strategies trade fixed rules in the background; manual wallets per model below. */
function PaperPage() {
  const [paper, setPaper] = useState<PaperOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [notional, setNotional] = useState('100');

  useEffect(() => {
    let active = true;
    const refresh = () => getPaperOverview().then((value) => { if (active) { setPaper(value); setError(null); } }).catch((err: Error) => { if (active) setError(err.message); });
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const guard = async (action: () => Promise<void>, fallback: string) => {
    try { await action(); setError(null); } catch (err) { setError(err instanceof Error ? err.message : fallback); }
  };
  const toggle = () => guard(async () => {
    const controller = await setPaperController(!paper?.controller?.enabled, token);
    setPaper((current) => (current ? { ...current, controller } : current));
  }, 'Не удалось изменить режим');
  const reset = () => {
    if (!window.confirm('Сбросить все виртуальные кошельки и историю сделок? Накопленная проверка начнётся заново.')) return;
    void guard(async () => { await resetPaperPortfolio(token); setPaper(await getPaperOverview()); }, 'Не удалось сбросить');
  };
  const openTrade = (modelId: string, side: 'long' | 'short') => guard(async () => setPaper(await openPaperTrade(modelId, side, Number(notional))), 'Не удалось открыть позицию');
  const closeTrade = (modelId: string) => guard(async () => setPaper(await closePaperTrade(modelId)), 'Не удалось закрыть позицию');

  const strategies = paper?.strategies ?? [];
  const totalTrades = strategies.reduce((sum, s) => sum + s.trades_count, 0);

  return (
    <main className="monitoring-page">
      <section className="monitoring-hero">
        <div>
          <p className="eyebrow">ПРОВЕРКА В РЕАЛЬНОМ ВРЕМЕНИ</p>
          <h1>Виртуальная торговля</h1>
          <p>История может обмануть, будущее — нет. Стратегии торгуют найденными сигналами по жёстким правилам, без реальных денег.</p>
        </div>
        <span className={`monitoring-overall ${paper?.controller?.enabled ? 'ok' : 'check'}`}>{paper?.controller?.enabled ? 'РАБОТАЕТ' : 'ВЫКЛЮЧЕНО'}</span>
      </section>

      {!paper && !error && <p className="monitoring-placeholder">Загрузка…</p>}
      {error && <p className="monitoring-error">{error}</p>}

      {paper && (
        <>
          <section className="monitoring-panel">
            <div className="monitoring-panel-heading">
              <div><p className="eyebrow">ПРАВИЛА</p><h2>Как идёт проверка</h2></div>
              <span className="monitoring-chip ok">только виртуально</span>
            </div>
            <ul className="paper-rules">
              <li>Сервер проверяет сигналы <strong>каждую минуту</strong>, даже когда страница закрыта.</li>
              <li>Вход только на <strong>свежем</strong> сигнале (свеча закрылась меньше часа назад) по цене её закрытия.</li>
              <li>Выход <strong>строго по горизонту</strong> — по закрытию свечи, на которой он заканчивается.</li>
              <li>Комиссия <strong>0.05%</strong> за вход и за выход; позиция — 25% свободных денег кошелька.</li>
              <li>Вывод можно делать после <strong>50+ сделок</strong>: до этого разброс слишком большой.</li>
            </ul>
            <div className="paper-controller">
              <div>
                <strong>Автоматические стратегии</strong>
                <span>{paper.controller?.enabled ? `Включены · последняя проверка ${paper.controller.last_tick ? formatDateTime(paper.controller.last_tick) : '—'} · ${paper.controller.last_action || '—'}` : 'Выключены: новые сделки не открываются'}</span>
              </div>
              <div className="paper-admin">
                <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" />
                <button className={paper.controller?.enabled ? 'enabled' : ''} disabled={!token} onClick={toggle}>{paper.controller?.enabled ? 'Выключить' : 'Включить'}</button>
                <button className="paper-reset" disabled={!token} onClick={reset}>Сбросить</button>
              </div>
            </div>
          </section>

          <section className="monitoring-panel">
            <div className="monitoring-panel-heading">
              <div><p className="eyebrow">СТРАТЕГИИ</p><h2>Результаты на будущих данных</h2></div>
              <span className="monitoring-chip shadow">{totalTrades} сделок · BTC {formatPrice(paper.current_price)}</span>
            </div>
            <div className="strategy-grid">{strategies.map((s) => <StrategyCard key={s.id} strategy={s} />)}</div>
          </section>

          <section className="monitoring-panel paper-panel">
            <div className="monitoring-panel-heading"><div><p className="eyebrow">РУЧНОЙ РЕЖИМ</p><h2>Кошельки моделей</h2></div></div>
            <p className="monitoring-muted">Можно вручную открыть виртуальную позицию по прогнозу любой текущей модели. Эти сделки не входят в результаты стратегий.</p>
            <div className="paper-controls"><label>Сумма сделки<input type="number" min="10" step="10" value={notional} onChange={(e) => setNotional(e.target.value)} /></label><span>Стартовый кошелёк каждой модели: $10,000</span></div>
            <div className="paper-model-grid">{paper.models.map((model) => <PaperModelCard key={model.model_id} model={model} openTrade={openTrade} closeTrade={closeTrade} />)}</div>
          </section>
        </>
      )}
    </main>
  );
}

function StrategyCard({ strategy: s }: { strategy: PaperStrategy }) {
  const position = s.position;
  return (
    <article className={`strategy-card ${s.kind}`}>
      <div className="strategy-top"><strong>{s.label}</strong><small>горизонт {s.horizon_hours} ч</small></div>
      <p className="strategy-desc">{s.description}</p>
      <div className="paper-wallet-stats">
        <div><span>Сделок</span><strong>{s.trades_count}</strong></div>
        <div><span>Попаданий</span><strong>{share(s.win_rate)}</strong></div>
        <div><span>Доходность</span><strong className={s.return_pct >= 0 ? 'profit' : 'loss'}>{signedPct(s.return_pct)}</strong></div>
      </div>
      <div className="strategy-rows">
        <div><span>Нижняя граница попаданий (95%)</span><b>{share(s.win_rate_lower_95)}</b></div>
        <div><span>Средняя сделка после комиссий</span><b>{signedPct(s.avg_trade_return)}</b></div>
        <div><span>Комиссии</span><b>{money(s.fees_paid)}</b></div>
        <div><span>Кошелёк</span><b>{money(s.equity)}</b></div>
      </div>
      {position ? (
        <div className="strategy-position">
          <span className={position.side}>{position.side === 'long' ? 'ВВЕРХ' : 'ВНИЗ'} · вход {formatPrice(position.entry_price)}</span>
          <strong className={position.unrealized_pnl >= 0 ? 'profit' : 'loss'}>{position.unrealized_pnl >= 0 ? '+' : ''}{money(position.unrealized_pnl)}</strong>
          <small>выход {formatDateTime(position.expires_at)}</small>
        </div>
      ) : <p className="strategy-idle">Ждёт сигнала</p>}
      {s.recent_trades.length > 0 && (
        <details className="paper-history">
          <summary>Последние сделки</summary>
          {s.recent_trades.map((t) => (
            <div className="paper-trade-row" key={t.opened_at}>
              <span>{formatDateTime(t.opened_at)}</span>
              <span>{t.side === 'long' ? 'вверх' : 'вниз'} {t.correct ? '✓' : '✗'}</span>
              <strong className={t.pnl >= 0 ? 'profit' : 'loss'}>{signedPct(t.return_pct)}</strong>
            </div>
          ))}
        </details>
      )}
    </article>
  );
}

function modelName(type: string) {
  if (type.includes('meta')) return 'Meta ACCEPT/SKIP';
  if (type.includes('state')) return 'State-aware barrier';
  if (type.includes('barrier')) return 'XGBoost barrier';
  if (type.includes('quantile')) return 'Диапазон цены';
  return 'XGBoost direction';
}

function modelClass(type: string) {
  if (type.includes('meta')) return 'meta-wallet';
  if (type.includes('state')) return 'state-wallet';
  if (type.includes('barrier')) return 'barrier-wallet';
  return 'direction-wallet';
}

const EMPTY_WALLET: PaperWallet = { initial_balance: 10000, cash: 10000, equity: 10000, realized_pnl: 0, unrealized_pnl: 0, return_pct: 0, position: null, trades: [] };

function PaperModelCard({ model, openTrade, closeTrade }: { model: PaperModel; openTrade: (id: string, side: 'long' | 'short') => void; closeTrade: (id: string) => void }) {
  const wallet = model.wallet ?? EMPTY_WALLET;
  const position = wallet.position;
  const forecast = model.forecast;
  return (
    <article className={`paper-model-card ${modelClass(model.model_type)}`}>
      <div className="paper-model-head"><div><strong>{modelName(model.model_type)}</strong><span>{model.status} · {model.feature_set_label || model.logic}</span></div><small>{model.horizon}</small></div>
      {forecast ? (
        <div className={`paper-forecast ${forecast.direction}`}>
          <div><span>Прогноз · {forecast.horizon}</span><strong>{forecast.direction === 'up' ? 'ВВЕРХ' : 'ВНИЗ'} · {Math.round(forecast.confidence * 100)}%</strong></div>
          <div><small>{forecast.has_skill ? 'умение подтверждено' : 'без подтверждённого умения'}</small></div>
        </div>
      ) : <div className="paper-forecast unavailable"><span>Прогноза направления нет</span></div>}
      <div className="paper-wallet-stats">
        <div><span>Кошелёк</span><strong>{money(wallet.equity)}</strong></div>
        <div><span>PnL</span><strong className={wallet.return_pct >= 0 ? 'profit' : 'loss'}>{signedPct(wallet.return_pct)}</strong></div>
        <div><span>Сделок</span><strong>{wallet.trades.length}</strong></div>
      </div>
      {position ? (
        <div className="paper-position"><span className={position.side}>{position.side.toUpperCase()} · ${position.notional.toFixed(0)}</span><strong className={position.unrealized_pnl >= 0 ? 'profit' : 'loss'}>{position.unrealized_pnl >= 0 ? '+' : ''}{money(position.unrealized_pnl)}</strong><button onClick={() => closeTrade(model.model_id)}>Закрыть</button></div>
      ) : (
        <div className="paper-actions"><button onClick={() => openTrade(model.model_id, 'long')}>LONG</button><button onClick={() => openTrade(model.model_id, 'short')}>SHORT</button></div>
      )}
    </article>
  );
}

export default PaperPage;

import { useEffect, useState } from 'react';
import type { MonitoringSnapshot } from '../../api/monitoring';
import { deleteOldModel } from '../../api/operations';
import { closePaperTrade, getPaperOverview, openPaperTrade, resetPaperPortfolio, type PaperOverview } from '../../api/paperTrading';
import type { RemoteState } from '../../hooks/usePolling';
import { formatDateTime } from '../../utils/format';
import './monitoring.css';

interface Props {
  state: RemoteState<MonitoringSnapshot>;
}

function statusLabel(ok: boolean) {
  return ok ? 'OK' : 'ПРОВЕРИТЬ';
}

function MonitoringPage({ state }: Props) {
  const [token, setToken] = useState('');
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperOverview | null>(null);
  const [paperError, setPaperError] = useState<string | null>(null);
  const [notional, setNotional] = useState('100');
  const snapshot = state.data;
  const live = snapshot?.live;
  const connections = Object.entries(live?.connections ?? {});
  const connected = connections.length > 0 && connections.every(([, item]) => item.connected === true);
  const updatedAt = live?.updated_at;
  const ageMinutes = updatedAt ? (Date.now() - new Date(updatedAt).getTime()) / 60_000 : Infinity;
  const liveFresh = ageMinutes <= 180 && (live?.parse_errors ?? 0) === 0;
  const liveOk = connected && liveFresh;
  const visibleModels = (snapshot?.models ?? []).filter((model) => !deleted.has(model.model_id));
  const latestByKey = new Map<string, string>();
  visibleModels.forEach((model) => {
    const key = `${model.model_type}|${model.symbol}|${model.interval}|${model.horizon}`;
    const currentId = latestByKey.get(key);
    const current = visibleModels.find((candidate) => candidate.model_id === currentId);
    if (!current || new Date(model.trained_at).getTime() > new Date(current.trained_at).getTime()) latestByKey.set(key, model.model_id);
  });
  const isLatest = (model: MonitoringSnapshot['models'][number]) => latestByKey.get(`${model.model_type}|${model.symbol}|${model.interval}|${model.horizon}`) === model.model_id;
  const activeModels = visibleModels.filter(isLatest);
  const historyModels = visibleModels.filter((model) => !isLatest(model));

  useEffect(() => {
    let active = true;
    const refresh = () => getPaperOverview().then((value) => { if (active) { setPaper(value); setPaperError(null); } }).catch((error: Error) => { if (active) setPaperError(error.message); });
    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function removeModel(modelId: string) {
    if (!token || !window.confirm('Удалить эту старую shadow-модель? Восстановить её через интерфейс нельзя.')) return;
    setDeleteError(null);
    try {
      await deleteOldModel(modelId, token);
      setDeleted((current) => new Set(current).add(modelId));
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Не удалось удалить модель');
    }
  }

  async function openTrade(modelId: string, side: 'long' | 'short') {
    if (!token) { setPaperError('Введи OPERATIONS_TOKEN для виртуальной сделки'); return; }
    try { setPaper(await openPaperTrade(modelId, side, Number(notional), token)); setPaperError(null); } catch (error) { setPaperError(error instanceof Error ? error.message : 'Не удалось открыть виртуальную позицию'); }
  }

  async function closeTrade(modelId: string) {
    if (!token) { setPaperError('Введи OPERATIONS_TOKEN для закрытия позиции'); return; }
    try { setPaper(await closePaperTrade(modelId, token)); setPaperError(null); } catch (error) { setPaperError(error instanceof Error ? error.message : 'Не удалось закрыть виртуальную позицию'); }
  }

  async function resetPaper() {
    if (!token || !window.confirm('Сбросить виртуальный баланс и историю сделок?')) return;
    try { await resetPaperPortfolio(token); const value = await getPaperOverview(); setPaper(value); setPaperError(null); } catch (error) { setPaperError(error instanceof Error ? error.message : 'Не удалось сбросить портфель'); }
  }

  return (
    <main className="monitoring-page">
      <section className="monitoring-hero">
        <div>
          <p className="eyebrow">КОНТРОЛЬ СИСТЕМЫ</p>
          <h1>Мониторинг</h1>
          <p>Состояние API, live-сборщика и моделей BTCUSDT в одном месте.</p>
        </div>
        <span className={`monitoring-overall ${snapshot && liveOk ? 'ok' : 'check'}`}>
          {snapshot ? statusLabel(liveOk) : 'ЗАГРУЗКА'}
        </span>
      </section>

      {state.status === 'loading' && !snapshot && <p className="monitoring-placeholder">Загрузка состояния…</p>}
      {state.status === 'error' && !snapshot && <p className="monitoring-placeholder error">Мониторинг недоступен: {state.error.message}</p>}

      {snapshot && (
        <>
          <section className="monitoring-grid">
            <StatusCard title="API" ok={snapshot.health.status === 'ok'} value={snapshot.health.status === 'ok' ? 'Работает' : snapshot.health.status} detail={`Версия ${snapshot.health.version}`} />
            <StatusCard title="Live-сборщик" ok={liveOk} value={live ? statusLabel(liveOk) : 'НЕ ЗАПУЩЕН'} detail={updatedAt ? `Обновлено ${formatDateTime(updatedAt)}` : 'Запусти локальный collector'} />
            <StatusCard title="Ошибки парсинга" ok={(live?.parse_errors ?? 0) === 0} value={String(live?.parse_errors ?? 0)} detail="За последний статус collector" />
            <StatusCard title="Модели" ok={snapshot.models.length > 0} value={String(snapshot.models.length)} detail="Сохранено в registry" />
            <StatusCard title="Свечи в выборке" ok={snapshot.data.is_valid} value={snapshot.data.rows.toLocaleString('ru-RU')} detail="Исторический 1h датасет" />
            <StatusCard title="Пропуски" ok={snapshot.data.gap_count === 0} value={String(snapshot.data.missing_candles)} detail={`${snapshot.data.gap_count} разрывов в данных`} />
          </section>

          <section className="monitoring-panel stage-panel">
            <div className="monitoring-panel-heading">
              <div>
                <p className="eyebrow">ПЛАН ОБУЧЕНИЯ</p>
                <h2>Текущий этап: {snapshot.training.current_label}</h2>
              </div>
              <span className={`monitoring-chip ${snapshot.training.next_ready ? 'ok' : 'check'}`}>
                {snapshot.training.next_ready ? 'можно тестировать' : 'собирать данные'}
              </span>
            </div>
            <p className="stage-recommendation">{snapshot.training.recommendation}</p>
            <div className="stage-list">
              {snapshot.training.stages.map((stage) => (
                <div className={`stage-row ${stage.state}`} key={stage.stage}>
                  <span className="stage-number">{stage.stage}</span>
                  <div className="stage-copy"><strong>{stage.label}</strong><span>{stage.description}</span></div>
                  <span className="stage-state">{stage.state === 'current' ? 'текущий' : stage.state === 'completed' ? 'пройден' : stage.state === 'ready_to_test' ? 'готов' : (stage.required_hours ? `${Math.floor(stage.coverage_hours / 24)} из ${Math.round(stage.required_hours / 24)} дн.` : 'нужна загрузка истории')}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="monitoring-panel">
            <div className="monitoring-panel-heading">
              <div>
                <p className="eyebrow">ИСТОЧНИКИ</p>
                <h2>Подключения live-сборщика</h2>
              </div>
              <span className={`monitoring-chip ${liveOk ? 'ok' : 'check'}`}>{live ? (liveOk ? 'актуально' : 'устарело') : 'локальный запуск'}</span>
            </div>
            <div className="connection-list">
              {connections.length > 0 ? connections.map(([name, item]) => (
                <div className="connection-row" key={name}>
                  <span className={`connection-dot ${item.connected ? 'ok' : 'check'}`} />
                  <span>{name}</span>
                  <strong>{item.connected ? 'подключено' : 'нет связи'}</strong>
                </div>
              )) : <p className="monitoring-muted">Collector не запущен. Выполни <code>python scripts/start_backend_with_collector.py</code> в backend.</p>}
            </div>
          </section>

          <section className="monitoring-panel">
            <div className="monitoring-panel-heading">
              <div>
                <p className="eyebrow">REGISTRY</p>
                <h2>Модели и горизонты</h2>
              </div>
            </div>
            <div className="model-list">
              <div className="registry-controls">
                <label>Токен операций<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" /></label>
                <span>Удалять можно только старые shadow-версии. Последняя версия защищена.</span>
              </div>
              {deleteError && <p className="monitoring-error">{deleteError}</p>}
              <ModelGroup title="Актуальные версии" models={activeModels} isHistory={false} removeModel={removeModel} token={token} />
              {historyModels.length > 0 && <details className="model-history" open>
                <summary>История версий ({historyModels.length})</summary>
                <ModelGroup title="" models={historyModels} isHistory removeModel={removeModel} token={token} />
              </details>}
              {visibleModels.length === 0 && <p className="monitoring-muted">Моделей в registry нет.</p>}
            </div>
          </section>

          <section className="monitoring-panel paper-panel">
            <div className="monitoring-panel-heading"><div><p className="eyebrow">PAPER TRADING</p><h2>Модели и виртуальный портфель</h2></div><span className="monitoring-chip ok">только виртуально</span></div>
            <p className="monitoring-muted">Модели не отправляют ордера на биржу. Кнопки открывают симулированную LONG/SHORT-позицию по текущей цене BTCUSDT.</p>
            <div className="paper-summary"><PaperMetric label="Equity" value={`$${paper?.equity.toFixed(2) ?? '—'}`} positive={(paper?.return_pct ?? 0) >= 0} /><PaperMetric label="Свободно" value={`$${paper?.cash.toFixed(2) ?? '—'}`} /><PaperMetric label="PnL" value={`${(paper?.return_pct ?? 0) >= 0 ? '+' : ''}${((paper?.return_pct ?? 0) * 100).toFixed(2)}%`} positive={(paper?.return_pct ?? 0) >= 0} /><PaperMetric label="BTC цена" value={paper ? `$${paper.current_price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'} /></div>
            <div className="paper-controls"><label>Сумма<input type="number" min="10" step="10" value={notional} onChange={(event) => setNotional(event.target.value)} /></label><span>Стартовый виртуальный баланс: $10,000</span><button className="paper-reset" onClick={resetPaper}>Сбросить портфель</button></div>
            {paperError && <p className="monitoring-error">{paperError}</p>}
            <div className="paper-model-grid">{(paper?.models ?? []).map((model) => { const position = paper?.positions.find((item) => item.model_id === model.model_id); return <article className="paper-model-card" key={model.model_id}><div className="paper-model-head"><div><strong>{paperModelName(model.model_type)}</strong><span>{model.status} · {model.feature_set_label || model.logic}</span></div><small>{model.horizon}</small></div>{position ? <div className="paper-position"><span className={position.side}>{position.side.toUpperCase()} · ${position.notional.toFixed(0)}</span><strong className={position.unrealized_pnl >= 0 ? 'profit' : 'loss'}>{position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(2)}</strong><button onClick={() => closeTrade(model.model_id)}>Закрыть</button></div> : <div className="paper-actions"><button onClick={() => openTrade(model.model_id, 'long')}>LONG</button><button onClick={() => openTrade(model.model_id, 'short')}>SHORT</button></div>}</article>; })}</div>
            {paper?.trades.length ? <details className="paper-history"><summary>Последние сделки ({paper.trades.length})</summary>{paper.trades.slice().reverse().map((trade, index) => <div className="paper-trade-row" key={`${trade.closed_at}-${index}`}><span>{paperModelName(trade.model_id.includes('meta') ? 'xgboost_meta_accept_skip' : '')}</span><span>{trade.side.toUpperCase()}</span><strong className={trade.pnl >= 0 ? 'profit' : 'loss'}>{trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</strong></div>)}</details> : null}
          </section>

          <p className="monitoring-note">Локальный режим: API должен работать на <code>http://127.0.0.1:8000</code>, а collector — отдельным процессом. Страница обновляется автоматически раз в минуту. Статус `shadow` означает, что модель наблюдается и ещё не допущена как подтверждённый сигнал.</p>
        </>
      )}
    </main>
  );
}

function ModelGroup({ title, models, isHistory, removeModel, token }: { title: string; models: MonitoringSnapshot['models']; isHistory: boolean; removeModel: (modelId: string) => void; token: string }) {
  return <section className="model-group">
    {title && <h3>{title}</h3>}
    {models.map((model) => <div className="model-row" key={model.model_id}>
      <div><strong>{model.horizon} <em className={isHistory ? 'history-label' : 'latest-label'}>{isHistory ? 'история' : 'актуальная'}</em></strong><span>{model.model_type} · {model.symbol}</span></div>
      <div className="model-actions"><span className={`monitoring-chip ${model.status === 'approved' ? 'ok' : 'shadow'}`}>{model.status ?? 'n/a'}</span>{isHistory && model.status !== 'approved' && <button className="model-delete" disabled={!token} onClick={() => removeModel(model.model_id)}>Удалить</button>}</div>
    </div>)}
  </section>;
}

function StatusCard({ title, ok, value, detail }: { title: string; ok: boolean; value: string; detail: string }) {
  return (
    <article className="monitoring-card">
      <div className="monitoring-card-top"><span>{title}</span><i className={`connection-dot ${ok ? 'ok' : 'check'}`} /></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function paperModelName(type: string) {
  if (type.includes('meta')) return 'Meta ACCEPT/SKIP';
  if (type.includes('pytorch')) return 'PyTorch GRU';
  if (type.includes('state')) return 'State-aware barrier';
  if (type.includes('barrier')) return 'XGBoost barrier';
  return 'XGBoost direction';
}

function PaperMetric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div><span>{label}</span><strong className={positive === undefined ? '' : positive ? 'profit' : 'loss'}>{value}</strong></div>;
}

export default MonitoringPage;

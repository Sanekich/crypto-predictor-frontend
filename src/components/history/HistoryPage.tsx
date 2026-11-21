import { useEffect, useState } from 'react';
import { archiveModel, getModelHistory, type ModelHistoryEntry, type ModelHistoryResponse } from '../../api/modelHistory';
import './history.css';

const pct = (value?: number) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const skill = (value?: number) => value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
const modelLabel = (model: ModelHistoryEntry) => model.model_type.includes('barrier') ? 'Barrier' : model.model_type.includes('pytorch') ? 'PyTorch' : model.model_type.includes('quantile') ? 'Quantile' : model.model_type.includes('neutral') ? 'Neutral direction' : 'XGBoost direction';

export default function HistoryPage() {
  const [data, setData] = useState<ModelHistoryResponse | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => getModelHistory().then(setData).catch((err: Error) => setError(err.message));
  useEffect(() => { refresh(); }, []);

  async function archive(model: ModelHistoryEntry) {
    const value = reason[model.model_id]?.trim();
    if (!token || !value) { setError('Введите OPERATIONS_TOKEN и причину архивации.'); return; }
    setBusy(model.model_id); setError(null);
    try { await archiveModel(model.model_id, model.source, value, token); setReason((current) => ({ ...current, [model.model_id]: '' })); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось архивировать модель'); }
    finally { setBusy(null); }
  }

  return <main className="history-page"><section className="history-hero"><div><p className="eyebrow">MODEL LIFECYCLE</p><h1>История моделей</h1><p>Активные версии остаются в registry. Убранные модели не удаляются: их артефакты, результаты и причина сохраняются в архиве.</p></div><span className="history-badge">reversible archive</span></section><section className="history-panel history-controls"><label>OPERATIONS_TOKEN<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Токен backend" autoComplete="off" /></label><button onClick={refresh}>Обновить</button></section>{error && <p className="history-error">{error}</p>}<section className="history-panel"><div className="history-heading"><div><p className="eyebrow">ACTIVE</p><h2>Оставлены в работе</h2></div><span>{data?.active.length ?? 0} моделей</span></div><div className="history-list">{data?.active.map((model) => <ModelRow key={`${model.source}-${model.model_id}`} model={model} reason={reason[model.model_id] ?? ''} onReason={(value) => setReason((current) => ({ ...current, [model.model_id]: value }))} onArchive={() => archive(model)} busy={busy === model.model_id} />)}</div></section><section className="history-panel"><div className="history-heading"><div><p className="eyebrow">ARCHIVE</p><h2>Предыдущие версии и причины</h2></div><span>{data?.archived.length ?? 0} моделей</span></div><div className="history-list">{data?.archived.length ? data.archived.map((model) => <ArchivedRow key={`${model.source}-${model.model_id}`} model={model} />) : <p className="history-muted">Архив пока пуст. Новые удаления будут переноситься сюда автоматически.</p>}</div></section></main>;
}

function ModelRow({ model, reason, onReason, onArchive, busy }: { model: ModelHistoryEntry; reason: string; onReason: (value: string) => void; onArchive: () => void; busy: boolean }) {
  return <article className="history-row"><div className="history-row-main"><div><strong>{modelLabel(model)} · {model.horizon ?? '—'}</strong><span>{model.model_type} · {model.feature_set ?? 'baseline'} · {model.source}</span></div><div className="history-metrics"><b>{pct(model.accuracy)}<small>accuracy</small></b><b>{skill(model.brier_skill)}<small>Brier skill</small></b><b>{model.positive_folds == null ? '—' : `${model.positive_folds}/${model.folds}`}<small>positive folds</small></b></div></div><div className="history-row-actions"><input value={reason} onChange={(event) => onReason(event.target.value)} placeholder="Причина архивации" /><button disabled={busy} onClick={onArchive}>{busy ? '…' : 'В архив'}</button></div></article>;
}

function ArchivedRow({ model }: { model: ModelHistoryEntry }) {
  return <article className="history-row archived"><div className="history-row-main"><div><strong>{modelLabel(model)} · {model.horizon ?? '—'}</strong><span>{model.model_type} · {model.feature_set ?? 'baseline'} · архив {model.archived_at ? new Date(model.archived_at).toLocaleString('ru-RU') : '—'}</span></div><div className="history-metrics"><b>{pct(model.accuracy)}<small>accuracy</small></b><b>{skill(model.brier_skill)}<small>Brier skill</small></b><b>{model.independent_signals ?? '—'}<small>signals ≥75%</small></b></div></div><p><strong>Почему убрана:</strong> {model.archive_reason || 'Причина не указана'}</p></article>;
}

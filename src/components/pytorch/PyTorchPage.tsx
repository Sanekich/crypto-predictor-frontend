import { useEffect, useState } from 'react';
import { getOperationStatus, startOperation, type OperationJob } from '../../api/operations';
import { getPytorchExperimentOverview, type PytorchBarrierModel, type PytorchExperimentOverview } from '../../api/pytorch';
import './pytorch.css';

const percent = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const signed = (value: number | null | undefined) => value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;

function ModelComparisonCard({ title, model }: { title: string; model: PytorchBarrierModel | null }) {
  if (!model) return <article className="pytorch-compare-card empty"><strong>{title}</strong><p>Модель ещё не обучена или не найдена.</p></article>;
  return <article className="pytorch-compare-card">
    <div className="pytorch-compare-top"><strong>{title}</strong><span className="pytorch-badge">{model.status}</span></div>
    <p className="pytorch-compare-sub">{model.config_label} · {model.feature_set_label}</p>
    <div className="pytorch-metrics">
      <div><span>Точность resolved</span><strong>{percent(model.accuracy)}</strong><small>baseline {percent(model.majority_baseline_accuracy)}</small></div>
      <div><span>Brier skill</span><strong>{signed(model.brier_skill)}</strong><small>ниже 0 — хуже baseline</small></div>
      <div><span>Разрешилось</span><strong>{percent(model.resolved_share)}</strong><small>{model.independent_resolved ?? 0} независимых ≥75%</small></div>
      <div><span>Попадание ≥75%</span><strong>{percent(model.independent_hit_rate)}</strong><small>нижняя 95%: {percent(model.hit_rate_lower_95)}</small></div>
    </div>
    <p className="pytorch-compare-sub">Признаков: {model.feature_count}{model.sequence_length ? ` · окно: ${model.sequence_length}h` : ''} · {new Date(model.trained_at).toLocaleString('ru-RU')}</p>
  </article>;
}

export default function PyTorchPage() {
  const [token, setToken] = useState('');
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [overview, setOverview] = useState<PytorchExperimentOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshJobs = () => token && getOperationStatus(token).then(setJobs).catch((e) => setError(e.message));
  const refreshOverview = () => getPytorchExperimentOverview().then(setOverview).catch(() => undefined);
  useEffect(() => { refreshOverview(); const timer = window.setInterval(refreshOverview, 15000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!token) return;
    refreshJobs();
    const timer = window.setInterval(refreshJobs, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const running = jobs.some((job) => job.action === 'train_pytorch' && job.status === 'running');
  async function train() {
    setError(null);
    try { await startOperation('train_pytorch', '24h', token, 'pytorch_full_derivatives'); refreshJobs(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось запустить обучение'); }
  }

  return <main className="pytorch-page">
    <section className="pytorch-hero"><div><p className="eyebrow">ЭКСПЕРИМЕНТ · BARRIER CHALLENGER</p><h1>PyTorch GRU</h1><p>Та же новая логика, что у моделей на вкладке «Новая логика»: какой барьер будет достигнут первым — <strong>+1% или −1% за 24 часа</strong>.</p></div><span className="pytorch-badge">experiment · shadow only</span></section>
    <section className="pytorch-panel"><div className="pytorch-heading"><div><p className="eyebrow">СРАВНЕНИЕ</p><h2>PyTorch против XGBoost</h2></div><button className="pytorch-refresh" onClick={refreshOverview}>Обновить</button></div><p className="pytorch-note">Сравнение использует barrier-метрики: точность считается только для resolved-событий, а сигналы ≥75% дополнительно проверяются по независимым периодам. XGBoost берётся из последней модели новой логики с теми же признаками.</p><div className="pytorch-compare-grid"><ModelComparisonCard title="XGBoost barrier · baseline" model={overview?.xgboost ?? null} /><ModelComparisonCard title="PyTorch GRU barrier · challenger" model={overview?.pytorch ?? null} /></div></section>
    <section className="pytorch-panel"><div className="pytorch-heading"><div><p className="eyebrow">ОБУЧЕНИЕ</p><h2>Полный набор derivatives</h2></div><span className={`pytorch-chip ${running ? 'busy' : 'ready'}`}>{running ? 'занято' : 'готово'}</span></div><div className="pytorch-facts"><span>±1% / 24h</span><span>OHLCV</span><span>funding</span><span>basis</span><span>open interest</span><span>DVOL</span><span>окно 168h</span></div><label className="pytorch-field">Токен операций<input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" /></label><button className="pytorch-run" onClick={train} disabled={running || !token}>Обучить PyTorch barrier GRU</button><p className="pytorch-note">Обучение запускается только кнопкой. Масштабирование считается на train-части, а артефакт сохраняется отдельным типом и всегда остаётся shadow. XGBoost и существующие barrier-модели не заменяются.</p>{error && <p className="pytorch-error">{error}</p>}</section>
    <section className="pytorch-panel"><div className="pytorch-heading"><div><p className="eyebrow">ИСТОРИЯ</p><h2>Последние запуски</h2></div><button className="pytorch-refresh" onClick={refreshJobs}>Обновить</button></div>{!token ? <p className="pytorch-muted">Введите токен, чтобы видеть логи.</p> : jobs.filter((job) => job.action === 'train_pytorch').map((job) => <article className="pytorch-job" key={job.job_id}><div><strong>train_pytorch_barrier</strong><span>±1% / 24h · {new Date(job.started_at).toLocaleString('ru-RU')}</span><em className={job.status}>{job.status}</em></div><pre>{job.output || 'Ожидание вывода…'}</pre></article>)}</section>
  </main>;
}

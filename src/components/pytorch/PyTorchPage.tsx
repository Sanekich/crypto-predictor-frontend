import { useCallback, useEffect, useState } from 'react';
import { getOperationStatus, startOperation, type OperationJob } from '../../api/operations';
import { getPytorchExperimentOverview, type PytorchBarrierModel, type PytorchExperimentOverview, type PytorchSignal } from '../../api/pytorch';
import './pytorch.css';

const percent = (value: number | null | undefined) => value == null ? '—' : `${(value * 100).toFixed(1)}%`;
const signed = (value: number | null | undefined) => value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

function ConfidenceTable({ signals }: { signals: PytorchSignal[] }) {
  return <div className="pytorch-confidence-wrap"><h4>Уверенные сигналы</h4><table className="pytorch-confidence"><thead><tr><th>Уверенность</th><th>Сигналов</th><th>Независимых</th><th>Разрешилось</th><th>Попаданий</th><th>Нижняя 95%</th></tr></thead><tbody>{signals.map((signal) => <tr key={signal.threshold}><td>≥ {(signal.threshold * 100).toFixed(0)}%</td><td>{signal.signals ?? 0}</td><td>{signal.independent_signals ?? 0}</td><td>{signal.independent_resolved ?? 0}</td><td>{percent(signal.independent_hit_rate)}</td><td>{percent(signal.hit_rate_lower_95)}</td></tr>)}</tbody></table></div>;
}

function WindowTable({ model }: { model: PytorchBarrierModel }) {
  return <div className="pytorch-windows"><div className="pytorch-window-heading"><h4>Проверка по периодам</h4><span>{model.window_summary.positive_folds}/{model.window_summary.folds} положительных</span></div><div className="pytorch-window-list">{model.windows.map((window) => <div className="pytorch-window-row" key={window.fold}><strong>{window.fold}</strong><span>{date(window.test_start)} — {date(window.test_end)}</span><b className={(window.brier_skill ?? 0) > 0 ? 'positive' : 'negative'}>{signed(window.brier_skill)}</b></div>)}</div></div>;
}

function ModelComparisonCard({ title, model }: { title: string; model: PytorchBarrierModel | null }) {
  if (!model) return <article className="pytorch-compare-card empty"><strong>{title}</strong><p>Модель ещё не обучена или не найдена.</p></article>;
  return <article className="pytorch-compare-card">
    <div className="pytorch-compare-top"><strong>{title}</strong><span className="pytorch-badge">{model.status}</span></div>
    <p className="pytorch-compare-sub">{model.config_label} · {model.feature_set_label}</p>
    <div className="pytorch-focus"><div><span>Средний Brier skill</span><strong>{signed(model.window_summary.mean_brier_skill)}</strong></div><div><span>Точность resolved</span><strong>{percent(model.accuracy)}</strong><small>baseline {percent(model.majority_baseline_accuracy)}</small></div><div><span>Максимальная уверенность</span><strong>{percent(model.max_confidence)}</strong></div><div><span>Сигналы ≥75%</span><strong>{model.independent_resolved ?? 0}</strong><small>попадание {percent(model.independent_hit_rate)}</small></div></div>
    <WindowTable model={model} />
    <ConfidenceTable signals={model.signals} />
    <p className="pytorch-compare-sub">{model.feature_count} признаков{model.sequence_length ? ` · окно ${model.sequence_length}h` : ''} · обучена {new Date(model.trained_at).toLocaleString('ru-RU')}</p>
  </article>;
}

export default function PyTorchPage() {
  const [token, setToken] = useState('');
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [overview, setOverview] = useState<PytorchExperimentOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshJobs = useCallback(() => token && getOperationStatus(token).then(setJobs).catch((e) => setError(e.message)), [token]);
  const refreshOverview = useCallback(() => getPytorchExperimentOverview().then(setOverview).catch(() => undefined), []);
  useEffect(() => { refreshOverview(); const timer = window.setInterval(refreshOverview, 15000); return () => window.clearInterval(timer); }, [refreshOverview]);
  useEffect(() => { if (!token) return; refreshJobs(); const timer = window.setInterval(refreshJobs, 5000); return () => window.clearInterval(timer); }, [refreshJobs, token]);

  const running = jobs.some((job) => job.action === 'train_pytorch' && job.status === 'running');
  async function train() {
    setError(null);
    try { await startOperation('train_pytorch', '24h', token, 'pytorch_full_derivatives'); refreshJobs(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось запустить обучение'); }
  }

  return <main className="pytorch-page">
    <section className="pytorch-hero"><div><p className="eyebrow">ЭКСПЕРИМЕНТ · BARRIER CHALLENGER</p><h1>PyTorch GRU</h1><p>Главный фокус — не средняя точность, а качество <strong>уверенных сигналов</strong>: сколько из них разрешилось, попало в направление и прошло независимую проверку.</p></div><span className="pytorch-badge">experiment · shadow only</span></section>
    <section className="pytorch-panel"><div className="pytorch-heading"><div><p className="eyebrow">СРАВНЕНИЕ СИГНАЛОВ</p><h2>PyTorch против XGBoost</h2></div><button className="pytorch-refresh" onClick={refreshOverview}>Обновить</button></div><p className="pytorch-note">Точность считается только по resolved-событиям. Уверенный сигнал — это прогноз с вероятностью ≥ порога; независимые сигналы не пересекаются по времени до разрешения предыдущего. Brier skill ниже нуля означает результат хуже базовой вероятности.</p><div className="pytorch-compare-grid"><ModelComparisonCard title="XGBoost barrier · baseline" model={overview?.xgboost ?? null} /><ModelComparisonCard title="PyTorch GRU barrier · challenger" model={overview?.pytorch ?? null} /></div></section>
    <section className="pytorch-panel"><div className="pytorch-heading"><div><p className="eyebrow">ОБУЧЕНИЕ</p><h2>Полный набор derivatives</h2></div><span className={`pytorch-chip ${running ? 'busy' : 'ready'}`}>{running ? 'занято' : 'готово'}</span></div><div className="pytorch-facts"><span>±1% / 24h</span><span>OHLCV</span><span>funding</span><span>basis</span><span>open interest</span><span>DVOL</span><span>окно 168h</span></div><label className="pytorch-field">Токен операций<input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" /></label><button className="pytorch-run" onClick={train} disabled={running || !token}>Обучить PyTorch barrier GRU</button><p className="pytorch-note">Обучение запускается только кнопкой. Масштабирование считается на train-части, а артефакт сохраняется отдельным типом и всегда остаётся shadow. XGBoost и существующие barrier-модели не заменяются.</p>{error && <p className="pytorch-error">{error}</p>}</section>
    <section className="pytorch-panel"><div className="pytorch-heading"><div><p className="eyebrow">ИСТОРИЯ</p><h2>Последние запуски</h2></div><button className="pytorch-refresh" onClick={refreshJobs}>Обновить</button></div>{!token ? <p className="pytorch-muted">Введите токен, чтобы видеть логи.</p> : jobs.filter((job) => job.action === 'train_pytorch').map((job) => <article className="pytorch-job" key={job.job_id}><div><strong>train_pytorch_barrier</strong><span>±1% / 24h · {new Date(job.started_at).toLocaleString('ru-RU')}</span><em className={job.status}>{job.status}</em></div><pre>{job.output || 'Ожидание вывода…'}</pre></article>)}</section>
  </main>;
}

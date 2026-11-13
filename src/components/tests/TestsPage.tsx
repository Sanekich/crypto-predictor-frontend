import { useEffect, useState } from 'react';
import { getOperationStatus, startOperation, type FeatureSet, type OperationAction, type OperationJob } from '../../api/operations';
import './tests.css';

const actions: { action: OperationAction; label: string; description: string }[] = [
  { action: 'status', label: 'Проверить данные', description: 'Свежесть live-сборщика и качество датасета' },
  { action: 'train_direction', label: 'Обучить direction', description: 'Обучение новой shadow-модели' },
  { action: 'walk_forward', label: 'Walk-forward', description: 'Проверка на последовательных периодах' },
  { action: 'regime_report', label: 'Режимы рынка', description: 'Качество по режимам волатильности и тренда' },
];

function TestsPage() {
  const [token, setToken] = useState('');
  const [horizon, setHorizon] = useState<'24h' | '7d'>('24h');
  const [featureSet, setFeatureSet] = useState<FeatureSet>('v1');
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    if (!token) return;
    getOperationStatus(token).then(setJobs).catch((err) => setError(err.message));
  };
  useEffect(() => {
    if (!token) return;
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function run(action: OperationAction) {
    setError(null);
    try {
      await startOperation(action, horizon, token, featureSet);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось запустить операцию');
    }
  }

  const running = jobs.some((job) => job.status === 'running');
  return (
    <main className="tests-page">
      <section className="tests-hero">
        <div><p className="eyebrow">ЭКСПЕРИМЕНТАЛЬНЫЙ ЦЕНТР</p><h1>Тесты и обучение</h1><p>Запускай проверки из интерфейса и следи за логами без замены production-моделей.</p></div>
        <span className="tests-badge">shadow only</span>
      </section>

      <section className="tests-panel tests-controls">
        <div className="tests-panel-heading"><div><p className="eyebrow">УПРАВЛЕНИЕ</p><h2>Запустить операцию</h2></div><span className={`tests-chip ${running ? 'busy' : 'ready'}`}>{running ? 'занято' : 'готово'}</span></div>
        <label className="tests-field">Токен операций<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" /></label>
        <div className="tests-horizons"><span>Горизонт</span><button className={horizon === '24h' ? 'active' : ''} onClick={() => setHorizon('24h')}>24 часа</button><button className={horizon === '7d' ? 'active' : ''} onClick={() => setHorizon('7d')}>7 дней</button></div>
        <label className="tests-field tests-select-field">Набор признаков<select value={featureSet} onChange={(event) => setFeatureSet(event.target.value as FeatureSet)}><option value="v1">v1 — OHLCV (baseline)</option><option value="v2_funding_basis">v2 — OHLCV + funding + basis</option><option value="v3_open_interest">v3 — + open interest</option></select></label>
        <div className="tests-action-grid">{actions.map((item) => <button className="tests-action" key={item.action} onClick={() => run(item.action)} disabled={running || !token}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
        <p className="tests-note">Токен не сохраняется в браузере. Backend должен иметь переменную <code>OPERATIONS_TOKEN</code>. Обучение всегда сохраняется только как shadow. Для v2 нужны funding и premium/basis, для v3 дополнительно metrics/open interest в <code>data/derivatives</code>. Одновременно разрешена только одна операция.</p>
        {error && <p className="tests-error">{error}</p>}
      </section>

      <section className="tests-panel"><div className="tests-panel-heading"><div><p className="eyebrow">ИСТОРИЯ</p><h2>Последние запуски</h2></div><button className="tests-refresh" onClick={refresh}>Обновить</button></div><div className="tests-jobs">{!token ? <p className="tests-muted">Введите токен операций, чтобы видеть журнал запусков.</p> : jobs.length === 0 ? <p className="tests-muted">Запусков пока нет.</p> : jobs.map((job) => <JobRow key={job.job_id} job={job} />)}</div></section>
    </main>
  );
}

function JobRow({ job }: { job: OperationJob }) {
  const featureLabel = job.feature_set === 'v2_funding_basis' ? 'v2 funding + basis' : job.feature_set === 'v3_open_interest' ? 'v3 + open interest' : 'v1 OHLCV';
  return <article className="tests-job"><div className="tests-job-top"><div><strong>{job.action}</strong><span>{job.horizon} · {featureLabel} · {new Date(job.started_at).toLocaleString('ru-RU')}</span></div><span className={`tests-chip ${job.status}`}>{job.status}</span></div><pre>{job.output || 'Ожидание вывода…'}</pre></article>;
}

export default TestsPage;

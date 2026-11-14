import { useEffect, useState } from 'react';
import { getOperationStatus, startOperation, type OperationJob } from '../../api/operations';
import './pytorch.css';

export default function PyTorchPage() {
  const [token, setToken] = useState('');
  const [horizon, setHorizon] = useState<'24h' | '7d'>('24h');
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => token && getOperationStatus(token).then(setJobs).catch((e) => setError(e.message));
  useEffect(() => {
    if (!token) return;
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const running = jobs.some((job) => job.status === 'running');
  async function train() {
    setError(null);
    try {
      await startOperation('train_pytorch', horizon, token, 'pytorch_full_derivatives');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось запустить обучение');
    }
  }

  return <main className="pytorch-page">
    <section className="pytorch-hero"><div><p className="eyebrow">SEQUENCE CHALLENGER</p><h1>PyTorch GRU</h1><p>Независимая shadow-модель, которая видит последовательность последних 168 часов.</p></div><span className="pytorch-badge">shadow only</span></section>
    <section className="pytorch-panel">
      <div className="pytorch-heading"><div><p className="eyebrow">ОБУЧЕНИЕ</p><h2>Полный набор derivatives</h2></div><span className={`pytorch-chip ${running ? 'busy' : 'ready'}`}>{running ? 'занято' : 'готово'}</span></div>
      <div className="pytorch-facts"><span>OHLCV</span><span>funding</span><span>basis</span><span>open interest</span><span>DVOL</span><span>окно 168h</span></div>
      <label className="pytorch-field">Токен операций<input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" /></label>
      <div className="pytorch-horizons"><span>Горизонт</span><button className={horizon === '24h' ? 'active' : ''} onClick={() => setHorizon('24h')}>24 часа</button><button className={horizon === '7d' ? 'active' : ''} onClick={() => setHorizon('7d')}>7 дней</button></div>
      <button className="pytorch-run" onClick={train} disabled={running || !token}>Обучить PyTorch GRU</button>
      <p className="pytorch-note">Модель обучается только по кнопке, масштабирование считается на train-части, split хронологический. Артефакт сохраняется отдельно и всегда остаётся shadow. Нужна установленная зависимость <code>torch</code>.</p>
      {error && <p className="pytorch-error">{error}</p>}
    </section>
    <section className="pytorch-panel"><div className="pytorch-heading"><div><p className="eyebrow">ИСТОРИЯ</p><h2>Последние запуски</h2></div><button className="pytorch-refresh" onClick={refresh}>Обновить</button></div>{!token ? <p className="pytorch-muted">Введите токен, чтобы видеть логи.</p> : jobs.filter((job) => job.action === 'train_pytorch').map((job) => <article className="pytorch-job" key={job.job_id}><div><strong>{job.action}</strong><span>{job.horizon} · full derivatives · {new Date(job.started_at).toLocaleString('ru-RU')}</span><em className={job.status}>{job.status}</em></div><pre>{job.output || 'Ожидание вывода…'}</pre></article>)}</section>
  </main>;
}

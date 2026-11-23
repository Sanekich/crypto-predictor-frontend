import { useCallback, useEffect, useState } from 'react';
import { getVolatilityOverview, type VolatilityModel, type VolatilityOverview, type VolatilitySignalStats } from '../../api/volatility';
import { getOperationStatus, startOperation, type OperationJob } from '../../api/operations';
import { usePolling } from '../../hooks/usePolling';
import { formatDateTime, formatPrice, formatShare } from '../../utils/format';
import '../barrier/barrier.css';
import './volatility.css';

const pct1 = new Intl.NumberFormat('ru-RU', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const share1 = (value: number | null | undefined) => (value == null ? '—' : pct1.format(value));
const skillText = (value: number | null | undefined) => (value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)} %`);

/** Volatility models: "will BTC move by X% either way within N hours?" - quality and the current forecast. */
function VolatilityPage() {
  const [version, setVersion] = useState(0);
  const state = usePolling((signal) => getVolatilityOverview(signal), 60_000, [version]);
  const overview = state.data;
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <main className="barrier-page">
      <section className="barrier-hero">
        <div>
          <p className="eyebrow">ВОЛАТИЛЬНОСТЬ</p>
          <h1>Будет ли сильное движение?</h1>
          <p>
            Направление биткоина почти не предсказуемо, а <strong>размер следующего движения — предсказуем</strong>: спокойные
            и бурные периоды идут сериями. Модель оценивает вероятность, что цена сдвинется хотя бы на X% в любую сторону.
          </p>
        </div>
        <span className="barrier-badge">artifacts/volatility</span>
      </section>

      {state.status === 'loading' && !overview && <p className="barrier-muted">Загрузка…</p>}
      {state.status === 'error' && !overview && <p className="barrier-error">Сервер недоступен: {state.error.message}</p>}

      {overview && (
        <>
          <NowPanel overview={overview} />
          {overview.configs.map((cfg) => (
            <section className="barrier-panel" key={cfg.key}>
              <div className="barrier-panel-heading">
                <div><p className="eyebrow">КОНФИГУРАЦИЯ</p><h2>{cfg.label}</h2></div>
              </div>
              <div className="barrier-cards">
                {overview.feature_sets.map((fs) => (
                  <ModelCard key={fs.key} label={fs.label} overview={overview}
                    model={overview.models.find((m) => m.config.key === cfg.key && m.feature_set === fs.key)} />
                ))}
              </div>
            </section>
          ))}
          <TrainingPanel onFinished={reload} />
          <p className="barrier-muted barrier-note">
            Brier skill — насколько вероятности модели лучше, чем «всегда отвечать средней частотой периода». Наивная модель —
            логистическая регрессия на одной волатильности за 24 часа: если полная модель её не обгоняет, она ничего не добавляет
            к простому «бурный рынок остаётся бурным». AUC — как часто модель ставит реальное движение выше спокойного часа (0.5 — монетка).
          </p>
        </>
      )}
    </main>
  );
}

/** Overview-page block: current big-move probabilities with a link to the full page. */
export function VolatilitySection() {
  const state = usePolling((signal) => getVolatilityOverview(signal), 60_000, []);
  if (!state.data) return null;
  return <NowPanel overview={state.data} compact />;
}

/** Current forecast of the candle-only models (they need no external data to be fresh). */
function NowPanel({ overview, compact = false }: { overview: VolatilityOverview; compact?: boolean }) {
  const live = overview.models.filter((m) => m.feature_set === 'candles' && m.forecast?.available);
  if (live.length === 0) return null;
  const asOf = live[0].forecast?.as_of;
  return (
    <section className={compact ? 'forecast-section volatility-section' : 'barrier-panel'}>
      <div className={compact ? 'section-heading' : 'barrier-panel-heading'}>
        <div><p className="eyebrow">{compact ? 'ВОЛАТИЛЬНОСТЬ' : 'СЕЙЧАС'}</p><h2>{compact ? 'Будет ли сильное движение' : 'Вероятность сильного движения'}</h2></div>
        {compact ? <a className="section-link" href="#/volatility">Подробнее →</a> : asOf && <span className="barrier-chip shadow">по свече до {formatDateTime(asOf)}</span>}
      </div>
      <div className="volatility-now">
        {live.map((m) => {
          const f = m.forecast!;
          const p = f.p_move ?? 0;
          return (
            <article className={`volatility-now-card ${f.signal ?? ''}`} key={m.model_id}>
              <span>{m.config.label}</span>
              <strong>{formatShare(p)}</strong>
              <div className="volatility-meter"><span style={{ width: `${p * 100}%` }} /></div>
              <small>
                {f.lower_price && f.upper_price ? `коридор ${formatPrice(f.lower_price)} — ${formatPrice(f.upper_price)}` : ''}
              </small>
              <small>{f.signal === 'move' ? 'уверенно ждёт движения' : f.signal === 'calm' ? 'уверенно ждёт спокойствия' : 'уверенного сигнала нет'}{m.walk_forward.has_skill ? '' : ' · модель без подтверждённого умения'}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ModelCard({ label, model, overview }: { label: string; model: VolatilityModel | undefined; overview: VolatilityOverview }) {
  if (!model) {
    return <article className="barrier-card empty"><div className="barrier-card-top"><strong>{label}</strong></div><p className="barrier-muted">Модель ещё не обучена: <code>python scripts/train_volatility_models.py</code>.</p></article>;
  }
  const wf = model.walk_forward;
  const skills = wf.brier_skill_by_fold ?? [];
  const maxAbs = Math.max(0.01, ...skills.map((s) => Math.abs(s)));
  const key = overview.signal_threshold.toFixed(2);
  const gate = overview.criteria.gate;
  return (
    <article className={`barrier-card ${model.status}`}>
      <div className="barrier-card-top">
        <strong>{label}</strong>
        <span className={`barrier-chip ${model.status === 'approved' ? 'ok' : 'shadow'}`}>{model.status === 'approved' ? 'цель достигнута' : 'наблюдение'}</span>
      </div>
      <p className="barrier-card-sub">Обучена {formatDateTime(model.trained_at)} · {model.dataset?.rows?.toLocaleString('ru-RU') ?? '—'} часов · сильное движение в {share1(model.dataset?.move_share)} случаев</p>

      <div className="barrier-block">
        <div className="barrier-block-title"><span>Проверка по периодам</span><strong className={wf.has_skill ? 'good' : 'muted'}>{wf.has_skill ? 'умение есть' : 'умения нет'} · {wf.positive_folds ?? 0}/{wf.folds ?? 0}</strong></div>
        <div className="barrier-folds">
          {skills.map((s, i) => (
            <div className="barrier-fold" key={i} title={`период ${i + 1}: skill ${skillText(s)}, AUC ${wf.auc_by_fold?.[i]?.toFixed(3) ?? '—'}`}>
              <div className="barrier-fold-bar"><span className={s >= 0 ? 'pos' : 'neg'} style={{ height: `${Math.max(4, (Math.abs(s) / maxAbs) * 100)}%` }} /></div>
              <small>{skillText(s)}</small>
            </div>
          ))}
        </div>
        <Row label="Brier skill модели" value={skillText(wf.brier_skill_mean)} />
        <Row label="Brier skill наивной модели" value={`${skillText(wf.baseline_brier_skill_mean)}${wf.beats_baseline ? ' · модель лучше' : ' · модель не лучше'}`} />
        <Row label="AUC (тест)" value={model.test.auc?.toFixed(3) ?? '—'} />
      </div>

      <div className="barrier-block">
        <div className="barrier-block-title"><span>Уверенные сигналы ≥ {formatShare(overview.signal_threshold)} за все периоды</span></div>
        <SignalRow title="«Будет движение»" stats={model.move_signals[key]} need={gate.min_independent_signals} />
        <SignalRow title="«Будет спокойно»" stats={model.calm_signals[key]} need={gate.min_independent_signals} />
        <ThresholdTable move={model.move_signals} calm={model.calm_signals} />
      </div>
      {model.gate && model.gate.reasons.length > 0 && <ul className="barrier-reasons">{model.gate.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
    </article>
  );
}

function SignalRow({ title, stats, need }: { title: string; stats: VolatilitySignalStats | null | undefined; need: number }) {
  const n = stats?.independent_signals ?? 0;
  return (
    <div className="barrier-progress">
      <span>{title}: {n} сигналов, попаданий {share1(stats?.independent_hit_rate)}, нижняя граница {share1(stats?.hit_rate_lower_95)}</span>
      <div className="barrier-progress-track"><span className={n >= need && (stats?.hit_rate_lower_95 ?? 0) >= 0.7 ? 'full' : ''} style={{ width: `${Math.min(100, (n / need) * 100)}%` }} /></div>
    </div>
  );
}

function ThresholdTable({ move, calm }: { move: Record<string, VolatilitySignalStats | null>; calm: Record<string, VolatilitySignalStats | null> }) {
  const keys = Object.keys(move).filter((k) => move[k] || calm[k]);
  if (keys.length === 0) return null;
  return (
    <table className="barrier-table">
      <thead><tr><th>Уверенность</th><th>Движение: сигн. / попад.</th><th>Спокойствие: сигн. / попад.</th></tr></thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <td>≥ {formatShare(Number(k))}</td>
            <td>{move[k]?.independent_signals ?? 0} / {share1(move[k]?.independent_hit_rate)}</td>
            <td>{calm[k]?.independent_signals ?? 0} / {share1(calm[k]?.independent_hit_rate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TrainingPanel({ onFinished }: { onFinished: () => void }) {
  const [token, setToken] = useState('');
  const [featureSet, setFeatureSet] = useState<'all' | 'candles' | 'all_data'>('all');
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const job = jobs.find((item) => item.action === 'train_volatility');
  const running = jobs.some((item) => item.status === 'running');

  useEffect(() => {
    if (!token) return;
    let wasRunning = false;
    const refresh = () => getOperationStatus(token).then((list) => {
      setJobs(list);
      const now = list.some((item) => item.action === 'train_volatility' && item.status === 'running');
      if (wasRunning && !now) onFinished();
      wasRunning = now;
    }).catch((err: Error) => setError(err.message));
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [token, onFinished]);

  async function train() {
    setError(null);
    try {
      const started = await startOperation('train_volatility', '24h', token, { barrierFeatureSet: featureSet });
      setJobs((list) => [started, ...list]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось запустить обучение');
    }
  }

  return (
    <section className="barrier-panel">
      <div className="barrier-panel-heading">
        <div><p className="eyebrow">ОБУЧЕНИЕ</p><h2>Переобучить модели волатильности</h2></div>
        <span className={`barrier-chip ${running ? 'running' : 'ok'}`}>{running ? 'идёт операция' : 'готово'}</span>
      </div>
      <div className="barrier-controls">
        <label>Токен операций<input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" /></label>
        <label>Данные<select value={featureSet} onChange={(e) => setFeatureSet(e.target.value as typeof featureSet)}><option value="all">оба набора</option><option value="candles">только свечи</option><option value="all_data">свечи + деривативы</option></select></label>
        <button className="barrier-run" disabled={!token || running} onClick={train}>Обучить</button>
      </div>
      <p className="barrier-muted">Переобучать имеет смысл, когда накопились новые данные (раз в неделю–месяц). Повторный запуск на тех же данных даёт тот же результат.</p>
      {error && <p className="barrier-error">{error}</p>}
      {token && job && <div className="barrier-jobs"><article className="barrier-job"><div><strong>{job.feature_set}</strong><span>{new Date(job.started_at).toLocaleString('ru-RU')}</span><span className={`barrier-chip ${job.status}`}>{job.status}</span></div><pre>{job.output || 'Ожидание вывода…'}</pre></article></div>}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="barrier-row"><span>{label}</span><strong>{value}</strong></div>;
}

export default VolatilityPage;

import { useEffect, useState } from 'react';
import {
  deleteBarrierModel,
  startBarrierTraining,
  type BarrierConfig,
  type BarrierModel,
  type BarrierOverview,
  type BarrierSignalStats,
} from '../../api/barrier';
import { getOperationStatus, type OperationJob } from '../../api/operations';
import { useBarrier } from '../../hooks/useBarrier';
import { formatDateTime, formatShare } from '../../utils/format';
import './barrier.css';

const pct1 = new Intl.NumberFormat('ru-RU', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const share1 = (value: number | null | undefined) => (value == null ? '—' : pct1.format(value));
const skillText = (value: number | null | undefined) =>
  value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)} %`;
const dateOnly = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** Progress of the new-logic ("which comes first: +X% or -X%?") models toward the 75% target. */
function BarrierPage() {
  const [version, setVersion] = useState(0);
  const state = useBarrier(version);
  const [token, setToken] = useState('');
  const [config, setConfig] = useState('all');
  const [featureSet, setFeatureSet] = useState('all');
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const overview = state.data;
  const models = (overview?.models ?? []).filter((m) => !deleted.has(m.model_id));
  const latest = models.filter((m) => m.is_latest);
  const trainingJobs = jobs.filter((job) => job.action === 'train_barrier');
  const running = trainingJobs.some((job) => job.status === 'running');

  // Job log needs the token; reload the overview once a training job has finished.
  useEffect(() => {
    if (!token) return;
    let wasRunning = false;
    const refresh = () =>
      getOperationStatus(token)
        .then((list) => {
          setJobs(list);
          const nowRunning = list.some((job) => job.action === 'train_barrier' && job.status === 'running');
          if (wasRunning && !nowRunning) setVersion((v) => v + 1);
          wasRunning = nowRunning;
        })
        .catch((err: Error) => setError(err.message));
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [token]);

  async function train() {
    setError(null);
    try {
      await startBarrierTraining(token, config, featureSet);
      const list = await getOperationStatus(token);
      setJobs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось запустить обучение');
    }
  }

  async function remove(modelId: string) {
    if (!token || !window.confirm('Удалить эту старую версию? Восстановить её через интерфейс нельзя.')) return;
    setError(null);
    try {
      await deleteBarrierModel(modelId, token);
      setDeleted((current) => new Set(current).add(modelId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить модель');
    }
  }

  const best = latest
    .filter((m) => (m.signals?.independent_resolved ?? 0) > 0)
    .sort((a, b) => (b.signals?.hit_rate_lower_95 ?? 0) - (a.signals?.hit_rate_lower_95 ?? 0))[0];
  const mostSignals = Math.max(0, ...latest.map((m) => m.signals?.independent_resolved ?? 0));
  const withSkill = latest.filter((m) => m.walk_forward.has_skill).length;
  const approved = latest.filter((m) => m.status === 'approved').length;

  return (
    <main className="barrier-page">
      <section className="barrier-hero">
        <div>
          <p className="eyebrow">НОВАЯ ЛОГИКА</p>
          <h1>Направление заметного движения</h1>
          <p>
            Модель отвечает на вопрос: <strong>что наступит раньше — рост цены на X% или падение на X%?</strong> Пороги
            симметричны, поэтому 75% попаданий значат, что направление угадано действительно в 3 случаях из 4.
          </p>
        </div>
        <span className="barrier-badge">artifacts/barrier · отдельно от старых моделей</span>
      </section>

      {state.status === 'loading' && !overview && <p className="barrier-muted">Загрузка…</p>}
      {state.status === 'error' && !overview && <p className="barrier-error">Сервер недоступен: {state.error.message}</p>}

      {overview && (
        <>
          <section className="barrier-grid">
            <SummaryCard title="Моделей новой логики" value={String(latest.length)} detail={`${models.length} версий сохранено`} ok={latest.length > 0} />
            <SummaryCard title="Лучшая точность ≥ 75%" value={best ? share1(best.signals?.independent_hit_rate) : '—'} detail={best ? `${best.config_label}, ${best.feature_set_label}` : 'сигналов ≥ 75% пока нет'} ok={(best?.signals?.independent_hit_rate ?? 0) >= overview.criteria.gate.min_hit_rate} />
            <SummaryCard title="Сигналов до цели" value={`${mostSignals} / ${overview.criteria.gate.min_independent_signals}`} detail="независимых сигналов ≥ 75% за все периоды" ok={mostSignals >= overview.criteria.gate.min_independent_signals} />
            <SummaryCard title="Цель достигнута" value={`${approved} из ${latest.length}`} detail={`${withSkill} моделей с устойчивым умением`} ok={approved > 0} />
          </section>

          <section className="barrier-panel">
            <div className="barrier-panel-heading">
              <div>
                <p className="eyebrow">ЦЕЛЬ</p>
                <h2>Когда сигнал считается доказанным</h2>
              </div>
            </div>
            <ul className="barrier-criteria">
              <li>не меньше <strong>{overview.criteria.gate.min_independent_signals}</strong> независимых сигналов с уверенностью ≥ {formatShare(overview.logic.signal_threshold)}, у которых барьер был достигнут;</li>
              <li>попаданий среди них <strong>≥ {formatShare(overview.criteria.gate.min_hit_rate)}</strong>, а нижняя граница 95%-го интервала <strong>≥ {formatShare(overview.criteria.gate.min_hit_rate_lower_95)}</strong>;</li>
              <li>модель лучше базовой частоты (Brier skill &gt; 0) не меньше чем в <strong>{overview.criteria.skill_gate.min_positive_folds} из {overview.criteria.skill_gate.folds}</strong> последовательных периодов.</li>
            </ul>
            <p className="barrier-muted">Сигналы суммируются по тестовым периодам walk-forward: каждый период проверяется моделью, которая этих данных не видела.</p>
          </section>

          {overview.configs.map((cfg) => (
            <ConfigPanel key={cfg.key} config={cfg} overview={overview} models={models} token={token} onDelete={remove} />
          ))}

          <section className="barrier-panel">
            <div className="barrier-panel-heading">
              <div>
                <p className="eyebrow">ОБУЧЕНИЕ</p>
                <h2>Переобучить модели новой логики</h2>
              </div>
              <span className={`barrier-chip ${running ? 'running' : 'ok'}`}>{running ? 'идёт обучение' : 'готово'}</span>
            </div>
            <div className="barrier-controls">
              <label>Токен операций<input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="OPERATIONS_TOKEN" autoComplete="off" /></label>
              <label>Конфигурация<select value={config} onChange={(e) => setConfig(e.target.value)}><option value="all">все три</option>{overview.configs.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
              <label>Данные<select value={featureSet} onChange={(e) => setFeatureSet(e.target.value)}><option value="all">оба набора</option>{overview.feature_sets.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
              <button className="barrier-run" disabled={!token || running} onClick={train}>Обучить</button>
            </div>
            <p className="barrier-muted">Новые версии сохраняются в <code>artifacts/barrier/models</code>; старые модели не затрагиваются. Полное обучение (3 конфигурации × 2 набора) занимает несколько минут. Страница обновится сама, когда обучение закончится.</p>
            {error && <p className="barrier-error">{error}</p>}
            {token && trainingJobs.length > 0 && (
              <div className="barrier-jobs">
                {trainingJobs.slice(0, 3).map((job) => (
                  <article className="barrier-job" key={job.job_id}>
                    <div><strong>{job.barrier_config ?? 'all'} · {job.barrier_feature_set ?? 'all'}</strong><span>{new Date(job.started_at).toLocaleString('ru-RU')}</span><span className={`barrier-chip ${job.status}`}>{job.status}</span></div>
                    <pre>{job.output || 'Ожидание вывода…'}</pre>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="barrier-muted barrier-note">
            Модели новой логики пока не участвуют в прогнозах на сайте: здесь отслеживается их качество на истории.
            «Разрешилось» — барьер был достигнут за отведённое время; «без движения» — ни один барьер не достигнут.
          </p>
        </>
      )}
    </main>
  );
}

function ConfigPanel({ config, overview, models, token, onDelete }: {
  config: BarrierConfig;
  overview: BarrierOverview;
  models: BarrierModel[];
  token: string;
  onDelete: (modelId: string) => void;
}) {
  const ofConfig = models.filter((m) => m.config_key === config.key);
  const anyLatest = ofConfig.find((m) => m.is_latest);
  const resolved = anyLatest?.outcome_shares ? (anyLatest.outcome_shares.up ?? 0) + (anyLatest.outcome_shares.down ?? 0) : null;
  return (
    <section className="barrier-panel">
      <div className="barrier-panel-heading">
        <div>
          <p className="eyebrow">КОНФИГУРАЦИЯ</p>
          <h2>{config.label}</h2>
        </div>
        <span className="barrier-chip shadow">{resolved == null ? 'ещё не обучена' : `барьер достигается в ${formatShare(resolved)} случаев`}</span>
      </div>
      <div className="barrier-cards">
        {overview.feature_sets.map((fs) => {
          const versions = ofConfig.filter((m) => m.feature_set === fs.key);
          const model = versions.find((m) => m.is_latest);
          return (
            <ModelCard key={fs.key} label={fs.label} model={model} history={versions.filter((m) => !m.is_latest)} overview={overview} token={token} onDelete={onDelete} />
          );
        })}
      </div>
    </section>
  );
}

function ModelCard({ label, model, history, overview, token, onDelete }: {
  label: string;
  model: BarrierModel | undefined;
  history: BarrierModel[];
  overview: BarrierOverview;
  token: string;
  onDelete: (modelId: string) => void;
}) {
  if (!model) {
    return (
      <article className="barrier-card empty">
        <div className="barrier-card-top"><strong>{label}</strong></div>
        <p className="barrier-muted">Модель ещё не обучена. Запустите обучение внизу страницы или <code>python scripts/train_barrier_models.py</code>.</p>
      </article>
    );
  }
  const wf = model.walk_forward;
  const sig = model.signals;
  const gate = overview.criteria.gate;
  const skills = wf.brier_skill_by_fold ?? [];
  const maxAbs = Math.max(0.002, ...skills.map((s) => Math.abs(s)));
  return (
    <article className={`barrier-card ${model.status}`}>
      <div className="barrier-card-top">
        <strong>{label}</strong>
        <span className={`barrier-chip ${model.status === 'approved' ? 'ok' : 'shadow'}`}>{model.status === 'approved' ? 'цель достигнута' : 'наблюдение'}</span>
      </div>
      <p className="barrier-card-sub">Обучена {formatDateTime(model.trained_at)} · {model.feature_count} признаков · {model.rows?.toLocaleString('ru-RU') ?? '—'} свечей ({dateOnly(model.first_timestamp)} — {dateOnly(model.last_timestamp)})</p>

      <div className="barrier-block">
        <div className="barrier-block-title"><span>Проверка по периодам (walk-forward)</span><strong className={wf.has_skill ? 'good' : 'muted'}>{wf.has_skill ? 'умение есть' : 'умения нет'} · {wf.positive_folds ?? 0}/{wf.folds ?? 0}</strong></div>
        <div className="barrier-folds" aria-label="Brier skill по периодам">
          {skills.map((s, i) => (
            <div className="barrier-fold" key={i} title={`период ${i + 1}: skill ${skillText(s)}, точность ${share1(wf.accuracy_by_fold?.[i])}`}>
              <div className="barrier-fold-bar"><span className={s >= 0 ? 'pos' : 'neg'} style={{ height: `${Math.max(4, (Math.abs(s) / maxAbs) * 100)}%` }} /></div>
              <small>{skillText(s)}</small>
            </div>
          ))}
        </div>
        <Row label="Средний Brier skill" value={skillText(wf.brier_skill_mean)} />
        <Row label="Точность (разрешившиеся)" value={`${share1(model.test.accuracy)} при базовой ${share1(model.test.majority_baseline_accuracy)}`} />
        <Row label="Максимальная уверенность" value={share1(wf.max_confidence ?? model.test.max_confidence)} />
      </div>

      <div className="barrier-block">
        <div className="barrier-block-title"><span>Сигналы ≥ {formatShare(overview.logic.signal_threshold)} за все периоды</span><strong>{sig?.independent_resolved ?? 0} разрешилось</strong></div>
        <Progress label={`Независимых сигналов: ${sig?.independent_resolved ?? 0} из ${gate.min_independent_signals}`} value={Math.min(1, (sig?.independent_resolved ?? 0) / gate.min_independent_signals)} />
        <Progress label={`Попаданий: ${share1(sig?.independent_hit_rate)} (нужно ${formatShare(gate.min_hit_rate)})`} value={sig?.independent_hit_rate == null ? 0 : Math.min(1, sig.independent_hit_rate / gate.min_hit_rate)} />
        <Progress label={`Нижняя граница 95%: ${share1(sig?.hit_rate_lower_95)} (нужно ${formatShare(gate.min_hit_rate_lower_95)})`} value={sig?.hit_rate_lower_95 == null ? 0 : Math.min(1, sig.hit_rate_lower_95 / gate.min_hit_rate_lower_95)} />
        <Row label="Без движения" value={`${sig?.independent_none ?? 0} сигналов (${share1(sig?.unresolved_share)})`} />
        <ThresholdTable stats={model.signals_by_threshold} />
      </div>

      {model.gate && model.gate.reasons.length > 0 && (
        <ul className="barrier-reasons">{model.gate.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
      )}

      {history.length > 0 && (
        <details className="barrier-history">
          <summary>Старые версии ({history.length})</summary>
          {history.map((old) => (
            <div className="barrier-history-row" key={old.model_id}>
              <span>{formatDateTime(old.trained_at)} · skill {skillText(old.walk_forward.brier_skill_mean)} · сигналов {old.signals?.independent_resolved ?? 0}, попаданий {share1(old.signals?.independent_hit_rate)}</span>
              <button disabled={!token} onClick={() => onDelete(old.model_id)}>Удалить</button>
            </div>
          ))}
        </details>
      )}
    </article>
  );
}

function ThresholdTable({ stats }: { stats: Record<string, BarrierSignalStats | null> }) {
  const rows = Object.entries(stats).filter(([, s]) => s);
  if (rows.length === 0) return null;
  return (
    <table className="barrier-table">
      <thead><tr><th>Уверенность</th><th>Сигналов</th><th>Попаданий</th><th>Нижняя 95%</th></tr></thead>
      <tbody>
        {rows.map(([t, s]) => (
          <tr key={t}>
            <td>≥ {formatShare(Number(t))}</td>
            <td>{s!.independent_resolved}</td>
            <td>{share1(s!.independent_hit_rate)}</td>
            <td>{share1(s!.hit_rate_lower_95)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="barrier-row"><span>{label}</span><strong>{value}</strong></div>;
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="barrier-progress">
      <span>{label}</span>
      <div className="barrier-progress-track"><span className={value >= 1 ? 'full' : ''} style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </div>
  );
}

function SummaryCard({ title, value, detail, ok }: { title: string; value: string; detail: string; ok: boolean }) {
  return (
    <article className="barrier-summary-card">
      <div><span>{title}</span><i className={`barrier-dot ${ok ? 'ok' : 'check'}`} /></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default BarrierPage;

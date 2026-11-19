import { useEffect, useState } from 'react';
import { getOperationStatus, startOperation, type OperationJob } from '../../api/operations';
import './ideas.css';

type IdeaTab = 'overview' | 'regimes' | 'events' | 'news' | 'barriers' | 'meta';

const tabs: { id: IdeaTab; label: string }[] = [
  { id: 'overview', label: 'Обзор' },
  { id: 'regimes', label: 'Режимы рынка' },
  { id: 'events', label: 'Изменения / shock' },
  { id: 'news', label: 'Новости и sentiment' },
  { id: 'barriers', label: 'Динамические барьеры' },
  { id: 'meta', label: 'Фильтр сигналов' },
];

const sources = [
  { name: 'Bitcoin Regime-Aware Forecasting', url: 'https://github.com/rapfii/Bitcoin-Regime-Aware-Forecasting', idea: 'GMM-режимы, triple-barrier, purged walk-forward, meta-labeling и cost-aware backtest.' },
  { name: 'Bitcoin Regime Detection', url: 'https://github.com/adhasins69/bitcoin-regime-detection', idea: 'HMM со скрытыми состояниями и разными правилами подтверждения сигнала.' },
  { name: 'Flamingo-ML', url: 'https://github.com/nogibjj/Flamingo-ML', idea: 'Новостной sentiment, social signals и строгая задержка признаков во времени.' },
  { name: 'Crypto Alpha Forecasting', url: 'https://github.com/shank959/crypto-alpha-forecasting', idea: 'Внешние данные, regime-aware weighting, cross-sectional признаки и leakage-aware CV.' },
];

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="ideas-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function IdeaCard({ title, status, description, bullets, accent = '' }: { title: string; status: string; description: string; bullets: string[]; accent?: string }) {
  return <article className={`ideas-card ${accent}`}><div className="ideas-card-head"><h3>{title}</h3><span className="ideas-status">{status}</span></div><p>{description}</p><ul>{bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></article>;
}

function StateAwareTrainingPanel() {
  const [token, setToken] = useState('');
  const [featureSet, setFeatureSet] = useState<'candles' | 'all_data'>('candles');
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const latest = jobs.find((job) => job.action === 'train_state_barrier');

  useEffect(() => {
    if (!token) return;
    let active = true;
    const refresh = () => getOperationStatus(token).then((items) => { if (active) setJobs(items); }).catch((err: Error) => { if (active) setError(err.message); });
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [token]);

  async function train() {
    setError(null);
    setStarting(true);
    try {
      const job = await startOperation('train_state_barrier', '24h', token, 'v1', 'all_data', 336, featureSet);
      setJobs((current) => [job, ...current.filter((item) => item.job_id !== job.job_id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось запустить state-aware обучение');
    } finally {
      setStarting(false);
    }
  }

  return <section className="ideas-panel ideas-training-panel"><div className="ideas-panel-title"><div><p className="eyebrow">НОВЫЙ SHADOW-ЭКСПЕРИМЕНТ</p><h2>State-aware barrier trainer</h2></div><span className="ideas-status">старые модели не меняются</span></div><p className="ideas-training-copy">Обучает отдельную модель на ±1% / 24h с causal state/shock-признаками. Результат сохраняется отдельно в <code>artifacts/experiments</code>.</p><div className="ideas-controls"><label>OPERATIONS_TOKEN<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Токен backend" autoComplete="off" /></label><label>Данные<select value={featureSet} onChange={(event) => setFeatureSet(event.target.value as 'candles' | 'all_data')}><option value="candles">только свечи</option><option value="all_data">свечи + derivatives</option></select></label><button className="ideas-run" disabled={!token || starting || latest?.status === 'running'} onClick={train}>{starting || latest?.status === 'running' ? 'Обучение…' : 'Обучить shadow'}</button></div>{error && <p className="ideas-error">{error}</p>}{latest && <article className="ideas-job"><div><strong>{latest.feature_set}</strong><span className={`ideas-job-status ${latest.status}`}>{latest.status}</span></div><pre>{latest.output || 'Ожидание вывода…'}</pre></article>}</section>;
}

function Overview() {
  return <>
    <section className="ideas-hero"><div><p className="eyebrow">RESEARCH LAB · SHADOW ONLY</p><h1>Идеи для следующего уровня модели</h1><p>Здесь собраны направления, которые можно проверять отдельно, не заменяя стабильные модели. Главный принцип: сначала гипотеза, затем causal-признаки, walk-forward и cost-aware backtest.</p></div><span className="ideas-lab-badge">production не затрагивается</span></section>
    <section className="ideas-metrics"><Metric label="Текущая цель" value="Надёжный сигнал" /><Metric label="Главная проблема" value="Нет ≥75% edge" /><Metric label="Текущая логика" value="±1% / 24h" /><Metric label="Следующий принцип" value="Divide by state" /></section>
    <div className="ideas-grid"><IdeaCard title="Разделяй по состояниям" status="рекомендуется первым" description="Сначала определять состояние рынка, затем менять калибровку или выбирать экспертную модель." bullets={['normal / trend / range / high volatility', 'отдельный shock и post-shock state', 'не создавать отдельные GRU, пока нет достаточного числа примеров']} accent="green" /><IdeaCard title="Твоя идея: модель замечает изменение мира" status="эксперимент" description="Не выдумывать конкретную новость, а обнаруживать необычный market shock по наблюдаемым данным." bullets={['abnormal return + volume + volatility jump', 'funding / OI / liquidation / DVOL shock', 'состояния normal → shock → post-shock']} accent="amber" /><IdeaCard title="Не заставлять модель торговать всегда" status="важно" description="Добавить отдельный фильтр, который может ответить «пропустить», если сигнал не подтверждён." bullets={['primary model: UP / DOWN', 'meta-model: accept / reject', 'порог зависит от состояния и исторического качества']} /></div>
    <StateAwareTrainingPanel /><section className="ideas-panel"><div className="ideas-panel-title"><div><p className="eyebrow">ИСТОЧНИКИ ИДЕЙ</p><h2>Что взято из публичных GitHub-проектов</h2></div></div><div className="ideas-sources">{sources.map((source) => <a className="ideas-source" href={source.url} target="_blank" rel="noreferrer" key={source.url}><strong>{source.name}</strong><span>{source.idea}</span><small>Открыть GitHub ↗</small></a>)}</div></section>
  </>;
}

function Regimes() {
  return <section className="ideas-content"><p className="eyebrow">STATE-AWARE MODELS</p><h1>Режимы рынка</h1><p className="ideas-lead">В репозитории уже есть causal-режимы в <code>app/ml/evaluation/regimes.py</code>, но сейчас они используются главным образом для отчёта. Следующий шаг — использовать состояние как вход для фильтра или маршрутизатора.</p><div className="ideas-grid"><IdeaCard title="Классификатор состояния" status="уже частично есть" description="Использовать тренд 168h и волатильность 24h, расширив их признаками derivatives." bullets={['trend_up / trend_down', 'range / high_volatility', 'confidence state вместо жёсткой метки']} /><IdeaCard title="Экспертная модель" status="shadow" description="Обучать отдельный barrier-эксперт только после проверки размера каждой группы." bullets={['global model как baseline', 'expert только если достаточно resolved-событий', 'сравнение на тех же периодах']} /></div><div className="ideas-flow"><span>данные</span><b>→</b><span>state detector</span><b>→</b><span>expert / calibration</span><b>→</b><span>signal или skip</span></div></section>;
}

function Events() {
  return <section className="ideas-content"><p className="eyebrow">YOUR IDEA · CHANGE-POINT LAYER</p><h1>Обнаружение «изменения мира»</h1><p className="ideas-lead">Модель не должна утверждать, что вышла конкретная новость. Она может определить, что рынок ведёт себя необычно и перешёл в новый state.</p><div className="ideas-event-grid"><div className="ideas-event-stage"><span>01</span><strong>Normal</strong><p>Обычные returns, volume и volatility.</p></div><div className="ideas-event-stage"><span>02</span><strong>Shock</strong><p>Резкий abnormal return, объём, DVOL или liquidations.</p></div><div className="ideas-event-stage"><span>03</span><strong>Post-shock</strong><p>Рынок переваривает событие, старые patterns временно слабее.</p></div><div className="ideas-event-stage"><span>04</span><strong>New normal</strong><p>Модель возвращается к обычной калибровке после стабилизации.</p></div></div><div className="ideas-panel compact"><h2>Первые признаки</h2><div className="ideas-tags"><span>return z-score</span><span>volume z-score</span><span>volatility jump</span><span>funding change</span><span>OI change</span><span>liquidation spike</span><span>DVOL jump</span></div></div></section>;
}

function News() {
  return <section className="ideas-content"><p className="eyebrow">EXTERNAL INFORMATION</p><h1>Новости и sentiment</h1><p className="ideas-lead">Новости имеют смысл только при точном времени публикации. Это отдельный feature set, который нельзя смешивать с текущим набором без проверки point-in-time alignment.</p><div className="ideas-news-grid"><IdeaCard title="Hourly news features" status="после shock detector" description="Сводить новости в числовые признаки, а не передавать модели сырой текст." bullets={['news_count_1h / news_count_24h', 'sentiment mean и negative share', 'importance и time_since_last_event']} /><IdeaCard title="Anti-leakage rules" status="обязательно" description="В прогнозе видны только публикации, доступные до закрытия текущей свечи." bullets={['publication timestamp, не время загрузки', 'backward merge с publication lag', 'никаких дневных итогов задним числом']} /></div></section>;
}

function Barriers() {
  return <section className="ideas-content"><p className="eyebrow">TARGET DESIGN</p><h1>Динамические барьеры</h1><p className="ideas-lead">Фиксированный ±1% одинаково трактует спокойный и очень волатильный рынок. Можно проверить barrier, масштабированный текущей ATR или realized volatility.</p><div className="ideas-barrier-compare"><div><span>Сейчас</span><strong>+1% / −1%</strong><small>одинаковая цель при любом рынке</small></div><b>→</b><div className="recommended"><span>Эксперимент</span><strong>± k × volatility</strong><small>порог адаптируется к состоянию</small></div></div><div className="ideas-grid"><IdeaCard title="Conservative" status="кандидат" description="Сигнал только если ожидаемый move покрывает fee + slippage с запасом." bullets={['ATR / realized vol', 'minimum economic edge', 'same walk-forward folds']} /><IdeaCard title="Triple barrier" status="кандидат" description="Profit-take, stop-loss и time-stop с явным исходом при окончании времени." bullets={['up / down / time-stop', 'учёт concurrency', 'cost-aware result']} /></div></section>;
}

function Meta() {
  return <section className="ideas-content"><p className="eyebrow">SIGNAL QUALITY</p><h1>Meta-labeling и право пропустить</h1><p className="ideas-lead">Это наиболее прямой способ улучшить именно то, чего сейчас не хватает: качество уверенных сигналов, а не обязательную точность на каждой свече.</p><div className="ideas-meta-flow"><div><span>Primary</span><strong>UP / DOWN</strong><small>предсказывает направление</small></div><b>+</b><div><span>Meta</span><strong>ACCEPT / SKIP</strong><small>оценивает доверие</small></div><b>=</b><div className="recommended"><span>Output</span><strong>signal / no signal</strong><small>торговать только при подтверждении</small></div></div><div className="ideas-panel compact"><h2>Что подать meta-модели</h2><div className="ideas-tags"><span>primary probability</span><span>market state</span><span>volatility</span><span>recent regime hit rate</span><span>distance from 50%</span><span>expected move after costs</span></div></div></section>;
}

export default function IdeasPage() {
  const [active, setActive] = useState<IdeaTab>('overview');
  return <main className="ideas-page"><nav className="ideas-tabs" aria-label="Исследовательские идеи">{tabs.map((tab) => <button className={active === tab.id ? 'active' : ''} key={tab.id} onClick={() => setActive(tab.id)}>{tab.label}</button>)}</nav>{active === 'overview' && <Overview />}{active === 'regimes' && <Regimes />}{active === 'events' && <Events />}{active === 'news' && <News />}{active === 'barriers' && <Barriers />}{active === 'meta' && <Meta />}</main>;
}

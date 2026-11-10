import type { HorizonSignal, JournalEntry, Signals } from '../../api/types';
import type { RemoteState } from '../../hooks/usePolling';
import { SIGNAL_THRESHOLD } from '../../hooks/useSignals';
import { formatDateTime, formatPrice, formatShare, formatTime } from '../../utils/format';
import { directionLabel, horizonLabel, reasonText, statusText } from './text';
import './signals.css';

interface Props {
  state: RemoteState<Signals>;
}

/** Separate window: only high-confidence (75-100%) direction signals and their track record. */
function SignalsPage({ state }: Props) {
  const { data } = state;

  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">СИГНАЛЫ ВЫСОКОЙ УВЕРЕННОСТИ</p>
          <h1>Сигналы 75–100%</h1>
          <p className="intro-copy">
            Направление цены BTC на 1–4 часа. Сигнал появляется, только когда откалиброванная уверенность модели
            не ниже {formatShare(SIGNAL_THRESHOLD)}.
          </p>
        </div>
      </section>

      {state.status === 'loading' && <p className="forecast-placeholder">Загрузка сигналов…</p>}
      {state.status === 'error' && !data && (
        <p className="forecast-placeholder error">Сервер сигналов недоступен: {state.error.message}</p>
      )}

      {data && (
        <>
          {data.horizons.length === 0 ? (
            <p className="forecast-placeholder">Модели направления ещё не обучены.</p>
          ) : (
            <div className="forecast-grid">
              {data.horizons.map((h) => (
                <SignalCard key={h.horizon} signal={h} />
              ))}
            </div>
          )}

          <SignalHistory data={data} />

          <p className="disclaimer">
            Уверенность откалибрована на исторических данных: «75%» означает, что похожие сигналы в прошлом сбывались
            примерно в 75% случаев. Модели в теневом режиме не прошли проверку, их сигналы нельзя считать надёжными.
            Это исследовательский прогноз, а не инвестиционная рекомендация. Данные на {formatTime(data.data_as_of)}.
          </p>
        </>
      )}
    </>
  );
}

function SignalCard({ signal }: { signal: HorizonSignal }) {
  const q = signal.quality;
  const active = signal.confidence >= SIGNAL_THRESHOLD;

  return (
    <article className={`forecast-card signal-card ${active ? `active ${signal.direction}` : ''}`}>
      <div className="forecast-topline">
        <span className="forecast-period">Горизонт {horizonLabel(signal.horizon)}</span>
        <span className={`status-badge ${signal.status}`}>{signal.status === 'approved' ? 'проверено' : 'теневой режим'}</span>
      </div>

      {active ? (
        <div className="signal-main">
          <span className={`signal-arrow ${signal.direction}`}>{signal.direction === 'up' ? '↑' : '↓'}</span>
          <div>
            <strong className="signal-direction">{directionLabel(signal.direction)}</strong>
            <span className="signal-confidence">уверенность {formatShare(signal.confidence)}</span>
            <span className="signal-target">до {formatDateTime(signal.target_time)}</span>
          </div>
        </div>
      ) : (
        <div className="signal-main idle">
          <strong>Сейчас сигнала нет</strong>
          <span>
            Модель склоняется {signal.direction === 'up' ? 'к росту' : 'к падению'} с уверенностью{' '}
            {formatShare(signal.confidence)} — ниже порога {formatShare(SIGNAL_THRESHOLD)}.
          </span>
        </div>
      )}

      <div className="probability-row">
        <span>Максимальная уверенность на проверке</span>
        <strong>{formatShare(q.max_confidence)}</strong>
      </div>
      <div className="probability-row">
        <span>Сигналов ≥ {formatShare(SIGNAL_THRESHOLD)} на проверке</span>
        <strong>
          {q.signals_at_threshold}
          {q.hit_rate !== null && ` · сбылось ${formatShare(q.hit_rate)}`}
        </strong>
      </div>
      <div className="probability-row">
        <span>Точность в целом / «всегда рост»</span>
        <strong>
          {formatShare(q.test_accuracy)} / {formatShare(q.always_up_accuracy)}
        </strong>
      </div>

      <div className={`status-note ${signal.status}`}>
        <strong>{statusText(signal)}</strong>
        {signal.status_reasons.length > 0 && (
          <ul>
            {signal.status_reasons.map((r) => (
              <li key={r}>{reasonText(r)}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function SignalHistory({ data }: { data: Signals }) {
  const { live, history } = data;

  return (
    <section className="forecast-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ЖУРНАЛ</p>
          <h2>Выданные сигналы и результат</h2>
        </div>
        <span className="forecast-caption">
          {live.resolved > 0
            ? `Сбылось ${live.correct} из ${live.resolved} (${formatShare(live.hit_rate ?? 0)})`
            : 'Статистика появится после первых завершённых сигналов'}
        </span>
      </div>

      {history.length === 0 ? (
        <div className="forecast-card empty-history">
          Сигналов с уверенностью ≥ {formatShare(SIGNAL_THRESHOLD)} пока не было. Это ожидаемо: на исторической
          проверке модели ни разу не достигали такой уверенности. Каждый будущий сигнал появится здесь вместе с
          фактическим результатом.
        </div>
      ) : (
        <div className="history-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Время</th>
                <th>Горизонт</th>
                <th>Сигнал</th>
                <th>Цена</th>
                <th>Итог</th>
              </tr>
            </thead>
            <tbody>
              {history.map((e) => (
                <HistoryRow key={`${e.horizon}-${e.signal_time}`} entry={e} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function HistoryRow({ entry: e }: { entry: JournalEntry }) {
  const result =
    e.correct === null ? (
      <span className="pending">ждём {formatTime(e.target_time)}</span>
    ) : (
      <span className={e.correct ? 'hit' : 'miss'}>
        {e.correct ? '✓ сбылся' : '✗ не сбылся'} · {formatPrice(e.outcome_price ?? 0)}
      </span>
    );

  return (
    <tr>
      <td>{formatDateTime(e.signal_time)}</td>
      <td>{horizonLabel(e.horizon)}</td>
      <td className={e.direction}>
        {directionLabel(e.direction)} · {formatShare(e.confidence)}
        {e.model_status !== 'approved' && <span className="tag">теневой</span>}
      </td>
      <td>{formatPrice(e.price_at_signal)}</td>
      <td>{result}</td>
    </tr>
  );
}

export default SignalsPage;

import type { HorizonSignal } from '../../api/types';
import type { RemoteState } from '../../hooks/usePolling';
import type { Signals } from '../../api/types';
import { routeHref } from '../../hooks/useRoute';
import { SIGNAL_THRESHOLD } from '../../hooks/useSignals';
import { formatShare } from '../../utils/format';
import { directionLabel, horizonLabel } from './text';
import './signals.css';

interface Props {
  state: RemoteState<Signals>;
}

/** Compact 1-4 hour direction block for the overview page. */
function ShortTermSection({ state }: Props) {
  const { data } = state;

  return (
    <section className="forecast-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">КРАТКОСРОЧНО</p>
          <h2>Направление на 1–4 часа</h2>
        </div>
        <a className="section-link" href={routeHref.signals}>
          Сигналы 75–100% →
        </a>
      </div>

      {state.status === 'loading' && <p className="forecast-placeholder">Загрузка…</p>}
      {state.status === 'error' && !data && (
        <p className="forecast-placeholder error">Не удалось получить сигналы: {state.error.message}</p>
      )}
      {data && data.horizons.length === 0 && (
        <p className="forecast-placeholder">Модели направления ещё не обучены.</p>
      )}

      {data && data.horizons.length > 0 && (
        <div className="forecast-grid">
          {data.horizons.map((h) => (
            <ShortTermCard key={h.horizon} signal={h} />
          ))}
        </div>
      )}
    </section>
  );
}

function ShortTermCard({ signal }: { signal: HorizonSignal }) {
  const up = signal.p_up;
  const strong = signal.confidence >= SIGNAL_THRESHOLD;

  return (
    <article className="forecast-card short-card">
      <div className="forecast-topline">
        <span className={`forecast-icon ${signal.direction}`} aria-hidden="true">
          {signal.direction === 'up' ? '↗' : '↘'}
        </span>
        <span className="forecast-period">Через {horizonLabel(signal.horizon)}</span>
        <span className={`status-badge ${signal.status}`}>{signal.status === 'approved' ? 'проверено' : 'теневой режим'}</span>
      </div>

      <div className="direction-split" aria-label={`Вероятность роста ${formatShare(up)}`}>
        <span className="split-down" style={{ width: `${(1 - up) * 100}%` }} />
        <span className="split-up" style={{ width: `${up * 100}%` }} />
      </div>
      <div className="range-labels">
        <span>вниз {formatShare(1 - up)}</span>
        <span>вверх {formatShare(up)}</span>
      </div>

      <div className="probability-row">
        <span>Сигнал ≥ {formatShare(SIGNAL_THRESHOLD)}</span>
        <strong className={strong ? '' : 'muted'}>
          {strong ? `${directionLabel(signal.direction)} · ${formatShare(signal.confidence)}` : 'нет'}
        </strong>
      </div>
    </article>
  );
}

export default ShortTermSection;

import type { ApiError } from '../../api/client';
import type { DirectionForecast } from '../../api/types';
import type { PredictionState } from '../../hooks/usePrediction';
import { formatDateTime, formatPrice, formatReturn, formatShare } from '../../utils/format';
import './forecast.css';

interface ForecastCardProps {
  title: string;
  tag: string;
  state: PredictionState;
}

const errorMessages: Record<string, string> = {
  MODEL_NOT_AVAILABLE: 'Модель для этого горизонта ещё не обучена.',
  DATA_STALE: 'Рыночные данные устарели — прогноз временно недоступен.',
  DATA_NOT_AVAILABLE: 'Недостаточно свежих рыночных данных для прогноза.',
  MODEL_INCOMPATIBLE: 'Модель нужно переобучить после обновления сервера.',
  NETWORK_ERROR: 'Сервер прогнозов недоступен. Запущен ли бекенд?',
};

function errorText(error: ApiError) {
  return errorMessages[error.code] ?? 'Не удалось получить прогноз.';
}

function directionText(direction: DirectionForecast) {
  if (direction.available && direction.direction && direction.confidence !== null && direction.confidence !== undefined) {
    const label = direction.direction === 'up' ? 'рост' : 'падение';
    const status = direction.status === 'shadow' ? ' · эксперимент' : '';
    return `${label} · ${formatShare(direction.confidence)}${status}`;
  }
  switch (direction.reason) {
    case 'NO_MODEL':
      return 'Направление не прогнозируется';
    case 'SHADOW':
      return 'Экспериментальный прогноз';
    default:
      return 'Выраженного направления нет';
  }
}

function ForecastCard({ title, tag, state }: ForecastCardProps) {
  const { data } = state;

  return (
    <article className="forecast-card" aria-busy={state.status === 'loading'}>
      <div className="forecast-topline">
        <span className="forecast-icon" aria-hidden="true">↕</span>
        <span className="forecast-period">{title}</span>
        <span className="forecast-tag">{tag}</span>
      </div>

      {state.status === 'loading' && <p className="forecast-placeholder">Загрузка прогноза…</p>}

      {state.status === 'error' && !data && <p className="forecast-placeholder error">{errorText(state.error)}</p>}

      {data && (
        <>
          <div className="forecast-result">
            <span className="forecast-direction">Ожидаемый диапазон</span>
            <strong>
              {formatReturn(data.range.lower_return)} … {formatReturn(data.range.upper_return)}
            </strong>
          </div>

          <RangeBar
            lower={data.range.lower_price}
            upper={data.range.upper_price}
            current={data.current_price}
          />

          <div className="probability-row">
            <span>Вероятность попасть в диапазон</span>
            <strong>{formatShare(data.range.probability)}</strong>
          </div>
          <div className="probability-row">
            <span>Медианный прогноз</span>
            <strong>{formatPrice(data.median_price)}</strong>
          </div>
          <div className="probability-row">
            <span>Направление</span>
            <strong className="muted">{directionText(data.direction)}</strong>
          </div>

          <p className="forecast-meta">
            На {formatDateTime(data.target_time)} · проверка на истории: в диапазон попало{' '}
            {formatShare(data.quality.test_coverage)} случаев
            {state.status === 'error' && <span className="error"> · не удалось обновить</span>}
          </p>
        </>
      )}
    </article>
  );
}

function RangeBar({ lower, upper, current }: { lower: number; upper: number; current: number }) {
  const position = Math.min(100, Math.max(0, ((current - lower) / (upper - lower)) * 100));

  return (
    <div className="range-bar">
      <div className="range-track">
        <span className="range-fill" />
        <span className="range-marker" style={{ left: `${position}%` }} title={`Сейчас ${formatPrice(current)}`} />
      </div>
      <div className="range-labels">
        <span>{formatPrice(lower)}</span>
        <span className="range-current">сейчас {formatPrice(current)}</span>
        <span>{formatPrice(upper)}</span>
      </div>
    </div>
  );
}

export default ForecastCard;

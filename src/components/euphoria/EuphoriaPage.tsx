import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { getEuphoriaOverview, type EuphoriaOverview, type EuphoriaStudyRow, type EuphoriaZone } from '../../api/euphoria';
import { usePolling } from '../../hooks/usePolling';
import { formatDateTime, formatPrice } from '../../utils/format';
import '../barrier/barrier.css';
import './euphoria.css';

const pct1 = new Intl.NumberFormat('ru-RU', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
const share = (value: number | null | undefined) => (value == null ? '—' : pct1.format(value));
const signedPct = (value: number | null | undefined) => (value == null ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`);

const ZONE_TEXT: Record<EuphoriaZone, { label: string; hint: string }> = {
  strong_euphoria: { label: 'Сильная эйфория', hint: 'Толпа сильно перекошена в лонги. На истории рост чаще продолжался, чем разворачивался.' },
  euphoria: { label: 'Эйфория', hint: 'Толпа перекошена в лонги. Разворот вниз на истории не подтвердился.' },
  neutral: { label: 'Норма', hint: 'Сильного перекоса нет — индекс сигнала не даёт.' },
  panic: { label: 'Паника', hint: 'Толпа в страхе. На истории после входа в панику цена через 24 часа чаще была выше.' },
  strong_panic: { label: 'Сильная паника', hint: 'Сильный страх. Самые редкие и самые сильные отскоки на истории.' },
};

/** Overview-page block: the current index value with a link to the full page. */
export function EuphoriaSection() {
  const state = usePolling((signal) => getEuphoriaOverview(signal), 10 * 60_000, []);
  const current = state.data?.current;
  if (!current) return null;
  const zone = ZONE_TEXT[current.zone];
  return (
    <section className="forecast-section">
      <div className="section-heading">
        <div><p className="eyebrow">НАСТРОЕНИЕ ТОЛПЫ</p><h2>Индекс эйфории и паники</h2></div>
        <a className="section-link" href="#/euphoria">Подробнее →</a>
      </div>
      <article className={`euphoria-compact ${current.zone}`}>
        <Gauge value={current.value} />
        <div>
          <strong>{zone.label} · {current.value >= 0 ? '+' : ''}{current.value.toFixed(2)}</strong>
          <p>{zone.hint}</p>
          <small>Данные на {formatDateTime(current.as_of)} (open interest публикуется раз в сутки)</small>
        </div>
      </article>
    </section>
  );
}

function EuphoriaPage() {
  const state = usePolling((signal) => getEuphoriaOverview(signal), 10 * 60_000, []);
  const data = state.data;
  return (
    <main className="barrier-page">
      <section className="barrier-hero">
        <div>
          <p className="eyebrow">НАСТРОЕНИЕ ТОЛПЫ</p>
          <h1>Индекс эйфории и паники</h1>
          <p>
            Пять признаков перекоса толпы сравниваются с последними 90 днями: funding, рост открытого интереса, доля лонгов,
            отрыв цены от средней и индекс страха и жадности. <strong>Плюс — эйфория, минус — паника.</strong>
          </p>
        </div>
        <span className="barrier-badge">исследование</span>
      </section>

      {state.status === 'loading' && !data && <p className="barrier-muted">Загрузка…</p>}
      {state.status === 'error' && !data && <p className="barrier-error">Сервер недоступен: {state.error.message}</p>}
      {data && !data.current && <p className="barrier-muted">Нет данных: выполните <code>python scripts/download_derivatives.py</code>.</p>}

      {data?.current && (
        <>
          <section className="barrier-panel">
            <div className="barrier-panel-heading">
              <div><p className="eyebrow">СЕЙЧАС</p><h2>{ZONE_TEXT[data.current.zone].label}</h2></div>
              <span className="barrier-chip shadow">данные на {formatDateTime(data.current.as_of)} · BTC {formatPrice(data.current.price)}</span>
            </div>
            <div className="euphoria-now">
              <div className={`euphoria-big ${data.current.zone}`}>
                <Gauge value={data.current.value} />
                <strong>{data.current.value >= 0 ? '+' : ''}{data.current.value.toFixed(2)}</strong>
                <p>{ZONE_TEXT[data.current.zone].hint}</p>
              </div>
              <div className="euphoria-components">
                {data.current.components.map((c) => (
                  <div className="euphoria-component" key={c.key}>
                    <span>{c.label}</span>
                    <div className="euphoria-bar"><i style={barStyle(c.z)} className={c.z >= 0 ? 'pos' : 'neg'} /></div>
                    <b>{c.z >= 0 ? '+' : ''}{c.z.toFixed(2)}</b>
                  </div>
                ))}
                <p className="barrier-muted">Значение — во сколько стандартных отклонений признак выше (+) или ниже (−) своей нормы за 90 дней.</p>
              </div>
            </div>
          </section>

          <section className="barrier-panel">
            <div className="barrier-panel-heading"><div><p className="eyebrow">ГОД</p><h2>Индекс и цена</h2></div></div>
            <HistoryChart overview={data} />
          </section>

          {data.study && <StudyPanel study={data.study} />}
        </>
      )}
    </main>
  );
}

function barStyle(z: number) {
  const width = Math.min(50, (Math.abs(z) / 3) * 50);
  return z >= 0 ? { left: '50%', width: `${width}%` } : { left: `${50 - width}%`, width: `${width}%` };
}

function Gauge({ value }: { value: number }) {
  const clamped = Math.max(-3, Math.min(3, value));
  return (
    <div className="euphoria-gauge" aria-label={`Индекс ${value.toFixed(2)}`}>
      <span className="euphoria-gauge-mark" style={{ left: `${((clamped + 3) / 6) * 100}%` }} />
      <div className="euphoria-gauge-labels"><small>паника</small><small>норма</small><small>эйфория</small></div>
    </div>
  );
}

function HistoryChart({ overview }: { overview: EuphoriaOverview }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const dates = overview.history.map((p) => p.date);
    chart.setOption({
      grid: { left: 44, right: 56, top: 16, bottom: 28 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#9aa59f', fontSize: 9 } },
      yAxis: [
        { type: 'value', name: 'индекс', min: -3, max: 3, axisLabel: { color: '#9aa59f', fontSize: 9 }, splitLine: { lineStyle: { color: '#eef2f0' } } },
        { type: 'value', name: 'BTC', position: 'right', scale: true, axisLabel: { color: '#9aa59f', fontSize: 9 }, splitLine: { show: false } },
      ],
      series: [
        {
          name: 'Индекс', type: 'line', data: overview.history.map((p) => Number(p.value.toFixed(2))), showSymbol: false, lineStyle: { width: 2, color: '#7a6fc9' },
          markArea: { silent: true, data: [
            [{ yAxis: overview.thresholds.euphoria, itemStyle: { color: 'rgba(224,163,67,0.10)' } }, { yAxis: 3 }],
            [{ yAxis: -3, itemStyle: { color: 'rgba(22,174,130,0.10)' } }, { yAxis: -overview.thresholds.euphoria }],
          ] },
        },
        { name: 'BTC', type: 'line', yAxisIndex: 1, data: overview.history.map((p) => Math.round(p.price)), showSymbol: false, lineStyle: { width: 1, color: '#c3ccc7' } },
      ],
    });
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [overview]);
  return <div ref={ref} className="euphoria-chart" />;
}

function StudyPanel({ study }: { study: NonNullable<EuphoriaOverview['study']> }) {
  const rows = [...study.results].sort((a, b) => (a.zone === b.zone ? a.threshold - b.threshold || a.horizon.localeCompare(b.horizon) : a.zone === 'panic' ? -1 : 1));
  return (
    <section className="barrier-panel">
      <div className="barrier-panel-heading">
        <div><p className="eyebrow">ИСТОРИЯ {study.period.start?.slice(0, 4)}–{study.period.end?.slice(0, 4)}</p><h2>Что было после крайностей</h2></div>
        <span className="barrier-chip shadow">отчёт от {formatDateTime(study.created_at)}</span>
      </div>
      <div className="euphoria-findings">
        <article><strong>Паника → отскок</strong><p>После входа индекса в зону паники цена через 24 часа чаще была выше, чем обычно. Но событий мало (десятки за 6 лет), а в 2026 году сработало только 3 из 7.</p></article>
        <article><strong>Эйфория ≠ разворот</strong><p>Расхожая идея «продавать эйфорию» не подтвердилась: после эйфории рост чаще продолжался.</p></article>
        <article><strong>Осторожно с выводами</strong><p>Проверено 18 вариантов; среди них случайно может найтись «хороший». Подтвердить или опровергнуть сигнал должна виртуальная торговля.</p></article>
      </div>
      <table className="barrier-table euphoria-table">
        <thead><tr><th>Зона</th><th>Порог</th><th>Через</th><th>Событий</th><th>Попаданий</th><th>Обычно</th><th>Нижняя 95%</th><th>Средний ход</th><th>Годы</th></tr></thead>
        <tbody>{rows.map((r) => <StudyRow key={`${r.zone}-${r.threshold}-${r.horizon}`} row={r} />)}</tbody>
      </table>
      <p className="barrier-muted">«Попаданий» — как часто цена пошла в ожидаемую сторону (после паники вверх, после эйфории вниз). «Обычно» — доля таких движений во все часы. События одного типа идут не чаще горизонта, поэтому независимы. Цель проекта — 77 событий и 75%: здесь событий слишком мало, чтобы её пройти.</p>
    </section>
  );
}

function StudyRow({ row }: { row: EuphoriaStudyRow }) {
  const better = row.hit_rate != null && row.base_rate != null && row.hit_rate > row.base_rate + 0.1 && row.events >= 10;
  return (
    <tr className={better ? 'euphoria-good' : ''}>
      <td>{row.zone === 'panic' ? 'паника → вверх' : 'эйфория → вниз'}</td>
      <td>{row.threshold.toFixed(1)}</td>
      <td>{row.horizon}</td>
      <td>{row.events}</td>
      <td>{share(row.hit_rate)}</td>
      <td>{share(row.base_rate)}</td>
      <td>{share(row.hit_rate_lower_95)}</td>
      <td>{signedPct(row.mean_return)}</td>
      <td>{row.positive_years}/{row.years}</td>
    </tr>
  );
}

export default EuphoriaPage;

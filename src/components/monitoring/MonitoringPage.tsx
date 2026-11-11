import type { MonitoringSnapshot } from '../../api/monitoring';
import type { RemoteState } from '../../hooks/usePolling';
import { formatDateTime } from '../../utils/format';
import './monitoring.css';

interface Props {
  state: RemoteState<MonitoringSnapshot>;
}

function statusLabel(ok: boolean) {
  return ok ? 'OK' : 'ПРОВЕРИТЬ';
}

function MonitoringPage({ state }: Props) {
  const snapshot = state.data;
  const live = snapshot?.live;
  const connections = Object.entries(live?.connections ?? {});
  const connected = connections.length > 0 && connections.every(([, item]) => item.connected === true);
  const updatedAt = live?.updated_at;
  const ageMinutes = updatedAt ? (Date.now() - new Date(updatedAt).getTime()) / 60_000 : Infinity;
  const liveFresh = ageMinutes <= 180 && (live?.parse_errors ?? 0) === 0;
  const liveOk = connected && liveFresh;

  return (
    <main className="monitoring-page">
      <section className="monitoring-hero">
        <div>
          <p className="eyebrow">КОНТРОЛЬ СИСТЕМЫ</p>
          <h1>Мониторинг</h1>
          <p>Состояние API, live-сборщика и моделей BTCUSDT в одном месте.</p>
        </div>
        <span className={`monitoring-overall ${snapshot && liveOk ? 'ok' : 'check'}`}>
          {snapshot ? statusLabel(liveOk) : 'ЗАГРУЗКА'}
        </span>
      </section>

      {state.status === 'loading' && !snapshot && <p className="monitoring-placeholder">Загрузка состояния…</p>}
      {state.status === 'error' && !snapshot && <p className="monitoring-placeholder error">Мониторинг недоступен: {state.error.message}</p>}

      {snapshot && (
        <>
          <section className="monitoring-grid">
            <StatusCard title="API" ok={snapshot.health.status === 'ok'} value={snapshot.health.status === 'ok' ? 'Работает' : snapshot.health.status} detail={`Версия ${snapshot.health.version}`} />
            <StatusCard title="Live-сборщик" ok={liveOk} value={statusLabel(liveOk)} detail={updatedAt ? `Обновлено ${formatDateTime(updatedAt)}` : 'Нет времени обновления'} />
            <StatusCard title="Ошибки парсинга" ok={(live?.parse_errors ?? 0) === 0} value={String(live?.parse_errors ?? 0)} detail="За последний статус collector" />
            <StatusCard title="Модели" ok={snapshot.models.length > 0} value={String(snapshot.models.length)} detail="Сохранено в registry" />
          </section>

          <section className="monitoring-panel">
            <div className="monitoring-panel-heading">
              <div>
                <p className="eyebrow">ИСТОЧНИКИ</p>
                <h2>Подключения live-сборщика</h2>
              </div>
              <span className={`monitoring-chip ${liveOk ? 'ok' : 'check'}`}>{liveOk ? 'актуально' : 'устарело'}</span>
            </div>
            <div className="connection-list">
              {connections.length > 0 ? connections.map(([name, item]) => (
                <div className="connection-row" key={name}>
                  <span className={`connection-dot ${item.connected ? 'ok' : 'check'}`} />
                  <span>{name}</span>
                  <strong>{item.connected ? 'подключено' : 'нет связи'}</strong>
                </div>
              )) : <p className="monitoring-muted">Нет данных о подключениях.</p>}
            </div>
          </section>

          <section className="monitoring-panel">
            <div className="monitoring-panel-heading">
              <div>
                <p className="eyebrow">REGISTRY</p>
                <h2>Модели и горизонты</h2>
              </div>
            </div>
            <div className="model-list">
              {snapshot.models.map((model) => (
                <div className="model-row" key={model.model_id}>
                  <div>
                    <strong>{model.horizon}</strong>
                    <span>{model.model_type} · {model.symbol}</span>
                  </div>
                  <span className={`monitoring-chip ${model.status === 'approved' ? 'ok' : 'shadow'}`}>
                    {model.status ?? 'n/a'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <p className="monitoring-note">Страница обновляется автоматически раз в минуту. Статус `shadow` означает, что модель наблюдается и ещё не допущена как подтверждённый сигнал.</p>
        </>
      )}
    </main>
  );
}

function StatusCard({ title, ok, value, detail }: { title: string; ok: boolean; value: string; detail: string }) {
  return (
    <article className="monitoring-card">
      <div className="monitoring-card-top"><span>{title}</span><i className={`connection-dot ${ok ? 'ok' : 'check'}`} /></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export default MonitoringPage;

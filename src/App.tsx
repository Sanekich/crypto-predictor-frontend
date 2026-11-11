import './App.css'
import Graph from './components/graph/graph'
import MonitoringPage from './components/monitoring/MonitoringPage'
import TestsPage from './components/tests/TestsPage'
import ForecastCard from './components/forecast/ForecastCard'
import ShortTermSection from './components/signals/ShortTermSection'
import SignalsPage from './components/signals/SignalsPage'
import { usePrediction } from './hooks/usePrediction'
import { routeHref, useRoute } from './hooks/useRoute'
import { useSignals } from './hooks/useSignals'
import { useMonitoring } from './hooks/useMonitoring'
import { formatTime } from './utils/format'

const SYMBOL = 'BTCUSDT'

function App() {
  const route = useRoute()
  const day = usePrediction(SYMBOL, '24h')
  const week = usePrediction(SYMBOL, '7d')
  const signals = useSignals(SYMBOL)
  const monitoring = useMonitoring(SYMBOL)
  const dataAsOf = day.data?.data_as_of ?? signals.data?.data_as_of ?? week.data?.data_as_of

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href={routeHref.overview} aria-label="CryptoPred — главная">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 16.5 9 11l3.5 3.5L20 6" />
              <path d="M14.5 6H20v5.5" />
            </svg>
          </span>
          <span>crypto<span className="brand-light">predictor</span></span>
        </a>

        <nav className="topnav" aria-label="Разделы">
          <a href={routeHref.overview} className={route === 'overview' ? 'active' : ''}>Обзор</a>
          <a href={routeHref.signals} className={route === 'signals' ? 'active' : ''}>Сигналы 75%+</a>
          <a href={routeHref.monitoring} className={route === 'monitoring' ? 'active' : ''}>Мониторинг</a>
          <a href={routeHref.tests} className={route === 'tests' ? 'active' : ''}>Тесты</a>
        </nav>

        <div className="topbar-note">
          <span className="live-dot" />
          {dataAsOf ? `Данные на ${formatTime(dataAsOf)}` : 'Подключение к серверу…'}
        </div>
      </header>

      {route === 'signals' ? (
        <SignalsPage state={signals} />
      ) : route === 'monitoring' ? (
        <MonitoringPage state={monitoring} />
      ) : route === 'tests' ? (
        <TestsPage />
      ) : (
        <>
          <section className="intro">
            <div>
              <p className="eyebrow">АНАЛИТИКА РЫНКА</p>
              <h1>Bitcoin</h1>
              <p className="intro-copy">Следите за рынком и смотрите, в каком диапазоне цена может оказаться дальше.</p>
            </div>
          </section>

          <Graph forecast={day.data} />

          <section className="forecast-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ВЗГЛЯД ВПЕРЁД</p>
                <h2>Прогноз цены</h2>
              </div>
              <span className="forecast-caption">Вероятностная оценка</span>
            </div>
            <div className="forecast-grid">
              <ForecastCard title="Завтра" tag="24 часа" state={day} />
              <ForecastCard title="Через неделю" tag="7 дней" state={week} />
            </div>
          </section>

          <ShortTermSection state={signals} />

          <p className="disclaimer">
            Диапазон — оценка модели машинного обучения: с указанной вероятностью цена окажется внутри него.
            Вероятность направления откалибрована на истории; сигналы моделей в теневом режиме не проверены.
            Это исследовательский прогноз, а не инвестиционная рекомендация.
          </p>
        </>
      )}
    </main>
  )
}

export default App

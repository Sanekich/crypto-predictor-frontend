import './App.css'
import Graph from './components/graph/graph'
import ForecastCard from './components/forecast/ForecastCard'
import { usePrediction } from './hooks/usePrediction'
import { formatTime } from './utils/format'

const SYMBOL = 'BTCUSDT'

function App() {
  const day = usePrediction(SYMBOL, '24h')
  const week = usePrediction(SYMBOL, '7d')
  const dataAsOf = day.data?.data_as_of ?? week.data?.data_as_of

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="CryptoPred — главная">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 16.5 9 11l3.5 3.5L20 6" />
              <path d="M14.5 6H20v5.5" />
            </svg>
          </span>
          <span>crypto<span className="brand-light">pred</span></span>
        </a>
        <div className="topbar-note">
          <span className="live-dot" />
          {dataAsOf ? `Прогноз по данным на ${formatTime(dataAsOf)}` : 'Подключение к серверу прогнозов…'}
        </div>
      </header>

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
        <p className="disclaimer">
          Диапазон — оценка модели машинного обучения: с указанной вероятностью цена окажется внутри него.
          Направление движения рынка надёжно не прогнозируется. Это исследовательский прогноз, а не инвестиционная
          рекомендация.
        </p>
      </section>
    </main>
  )
}

export default App

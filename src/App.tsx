import './App.css'
import Graph from './components/graph/graph'

function App() {
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
          Данные обновлены только что
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">АНАЛИТИКА РЫНКА</p>
          <h1>Криптовалюты</h1>
          <p className="intro-copy">Следите за рынком и смотрите, что может быть дальше.</p>
        </div>
      </section>

      
      <Graph />
        

      <section className="forecast-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ВЗГЛЯД ВПЕРЁД</p>
            <h2>Прогноз цены</h2>
          </div>
          <span className="forecast-caption">Вероятностная оценка</span>
        </div>
        <div className="forecast-grid">
          <article className="forecast-card">
            <div className="forecast-topline">
              <span className="forecast-icon">↗</span>
              <span className="forecast-period">Завтра</span>
              <span className="forecast-tag">24 часа</span>
            </div>
            <div className="forecast-result">
              <span className="forecast-direction">Ожидаемый рост</span>
              <strong>null</strong>
            </div>
            <div className="probability-row">
              <span>Вероятность роста</span><strong></strong>
            </div>
            <div className="probability-track"><span  /></div>
          </article>
          <article className="forecast-card">
            <div className="forecast-topline">
              <span className="forecast-icon">↗</span>
              <span className="forecast-period">Через неделю</span>
              <span className="forecast-tag">7 дней</span>
            </div>
            <div className="forecast-result">
              <span className="forecast-direction">Ожидаемый рост</span>
              <strong>null</strong>
            </div>
            <div className="probability-row">
              <span>Вероятность роста</span><strong>null%</strong>
            </div>
            <div className="probability-track"><span /></div>
          </article>
        </div>
        <p className="disclaimer">Прогнозы показаны для демонстрации интерфейса и не являются инвестиционной рекомендацией.</p>
      </section>
    </main>
  )
}

export default App

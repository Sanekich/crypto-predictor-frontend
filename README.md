# CryptoPredictor Frontend

Интерфейс CryptoPredictor: график BTC/USDT и вероятностный прогноз диапазона цены.
React + TypeScript + Vite, графики — ECharts.

> Прогнозы исследовательские и не являются инвестиционной рекомендацией.

## Требования

- Node.js 20+
- Запущенный [backend](https://github.com/Sanekich/crypto-predictor-backend) (по умолчанию `http://127.0.0.1:8000`)

## Запуск

```powershell
npm install
npm run dev
```

Открыть http://localhost:5173.

Адрес бекенда задаётся в `.env.local` (образец — `.env.example`):

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Откуда берутся данные

| Что | Источник |
|---|---|
| График и текущая цена | Binance напрямую (REST + WebSocket) |
| Прогноз (карточки и конус на графике) | Backend: `GET /predictions/BTCUSDT?horizon=24h` и `?horizon=7d` |

Прогноз — это диапазон, в который цена попадёт с вероятностью 80%, и медиана.
Направление (рост/падение) не показывается, пока у бекенда нет модели,
которая надёжно превосходит простые ориентиры.

## Структура

```text
src/
  api/            клиент и типы API бекенда
  hooks/          usePrediction — загрузка и обновление прогноза
  components/
    graph/        график цены с конусом прогноза
    forecast/     карточки прогноза
  utils/          форматирование чисел и дат
```

## Команды

```powershell
npm run dev       # сервер разработки
npm run build     # проверка типов и сборка
npm run lint      # линтер
```

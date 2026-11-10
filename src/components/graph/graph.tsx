
import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { Prediction } from '../../api/types';
import './graph.css';

type Range = '1D' | '1M' | '3M' | '1Y' | '5Y' | 'ALL';

type Candle = [number, number];

const ranges: Record<Range, { interval: string; start: number }> = {
  '1D': { interval: '5m', start: 1 },
  '1M': { interval: '1h', start: 30 },
  '3M': { interval: '4h', start: 90 },
  '1Y': { interval: '1d', start: 365 },
  '5Y': { interval: '1d', start: 365 * 5 },
  ALL: { interval: '1d', start: 0 },
};

const intervalMs: Record<string, number> = {
  '5m': 5 * 60_000,
  '1h': 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
};

const ALL_START = Date.UTC(2017, 7, 17);

// The 24h forecast cone is readable only on short ranges
const FORECAST_RANGES: Range[] = ['1D', '1M'];

const formatUsd = (value: number) =>
  '$' +
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface PriceChartProps {
  forecast?: Prediction | null;
}

function PriceChart({ forecast }: PriceChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [range, setRange] = useState<Range>('1D');
  const [data, setData] = useState<Candle[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    chart.setOption({
      animation: false,
      grid: {
        top: 10,
        bottom: 30,
        left: 0,
        right: 55,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: '#eeeeee',
        textStyle: {
          color: '#222222',
        },
        formatter: (params: any) => {
          const price = params.find((p: any) => p.seriesName === 'Bitcoin');
          if (price) {
            return `
              ${new Date(price.value[0]).toLocaleString()}<br/>
              <b>${formatUsd(Number(price.value[1]))}</b>
            `;
          }

          const lower = params.find((p: any) => p.seriesName === 'forecast-lower');
          const band = params.find((p: any) => p.seriesName === 'forecast-band');
          if (!lower || !band) return '';
          const low = Number(lower.value[1]);
          const high = low + Number(band.value[1]);
          return `
            ${new Date(lower.value[0]).toLocaleString()}<br/>
            Прогноз (80%): <b>${formatUsd(low)} — ${formatUsd(high)}</b>
          `;
        },
      },
      xAxis: {
        type: 'time',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#777777',
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        position: 'right',
        axisLabel: {
          color: '#777777',
          formatter: (value: number) =>
            '$' + value.toLocaleString('en-US'),
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(46, 46, 46, 0.06)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: 'Bitcoin',
          type: 'line',
          data: [],
          showSymbol: false,
          smooth: false,
          lineStyle: {
            color: '#f7525f',
            width: 2,
          },
          itemStyle: {
            color: '#f7525f',
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(247, 82, 95, 0.16)',
              },
              {
                offset: 1,
                color: 'rgba(247, 82, 95, 0.01)',
              },
            ]),
          },
        },
        // Forecast cone: an invisible lower line plus a stacked band up to the upper bound
        {
          name: 'forecast-lower',
          type: 'line',
          stack: 'forecast',
          data: [],
          showSymbol: false,
          lineStyle: { opacity: 0 },
          silent: true,
        },
        {
          name: 'forecast-band',
          type: 'line',
          stack: 'forecast',
          data: [],
          showSymbol: false,
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(19, 174, 128, 0.14)' },
          silent: true,
        },
        {
          name: 'forecast-median',
          type: 'line',
          data: [],
          showSymbol: false,
          lineStyle: { color: '#13ae80', width: 1.5, type: 'dashed' },
          silent: true,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartInstance.current = null;
    };
  }, []);

  // Update chart when data changes
  useEffect(() => {
    if (!chartInstance.current) return;

    chartInstance.current.setOption({
      series: [
        {
          data,
        },
      ],
    });
  }, [data]);

  // Draw the forecast cone from the last closed candle to the forecast horizon
  useEffect(() => {
    if (!chartInstance.current) return;

    const visible = forecast && FORECAST_RANGES.includes(range);
    let lower: [number, number][] = [];
    let band: [number, number][] = [];
    let median: [number, number][] = [];

    if (visible) {
      const start = Date.parse(forecast.data_as_of);
      const end = Date.parse(forecast.target_time);
      const now = forecast.current_price;
      lower = [[start, now], [end, forecast.range.lower_price]];
      band = [[start, 0], [end, forecast.range.upper_price - forecast.range.lower_price]];
      median = [[start, now], [end, forecast.median_price]];
    }

    chartInstance.current.setOption({
      series: [{}, { data: lower }, { data: band }, { data: median }],
    });
  }, [forecast, range]);

  // Load historical data and connect WebSocket
  useEffect(() => {
    const controller = new AbortController();
    const selected = ranges[range];

    let socket: WebSocket | null = null;

    setLoading(true);
    setError('');
    setData([]);

    const loadData = async () => {
      try {
        const now = Date.now();

        const startTime =
          range === 'ALL'
            ? ALL_START
            : now - selected.start * 24 * 60 * 60_000;

        const candles: Candle[] = [];
        let cursor = startTime;

        // Binance allows up to 1000 candles per request.
        // Pagination allows us to retrieve longer histories.
        while (cursor < now) {
          const url = new URL(
            'https://api.binance.com/api/v3/klines'
          );

          url.searchParams.set('symbol', 'BTCUSDT');
          url.searchParams.set('interval', selected.interval);
          url.searchParams.set('startTime', String(cursor));
          url.searchParams.set('endTime', String(now));
          url.searchParams.set('limit', '1000');

          const response = await fetch(url.toString(), {
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error('Failed to load Bitcoin data.');
          }

          const result = await response.json();

          if (!result.length) break;

          for (const candle of result) {
            candles.push([
              Number(candle[0]),
              Number(candle[4]),
            ]);
          }

          cursor =
            Number(result[result.length - 1][0]) +
            intervalMs[selected.interval];

          if (result.length < 1000) break;
        }

        if (controller.signal.aborted) return;

        setData(candles);

        if (candles.length) {
          setPrice(candles[candles.length - 1][1]);
        }

        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError('Unable to load Bitcoin market data.');
        setLoading(false);
      }
    };

    loadData();

    // Connect to Binance live market data
    socket = new WebSocket(
      `wss://stream.binance.com:9443/ws/btcusdt@kline_${selected.interval}`
    );

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const candle = message.k;

      if (!candle) return;

      const timestamp = Number(candle.t);
      const close = Number(candle.c);

      setPrice(close);

      setData((previous) => {
        const updated = [...previous];

        const lastIndex = updated.length - 1;

        if (
          lastIndex >= 0 &&
          updated[lastIndex][0] === timestamp
        ) {
          updated[lastIndex] = [timestamp, close];
        } else {
          updated.push([timestamp, close]);
        }

        return updated;
      });
    };

    socket.onerror = () => {
      console.error('Binance WebSocket connection error');
    };

    return () => {
      controller.abort();
      if (!socket) return;

      // React StrictMode (dev) mounts effects twice: the first socket is closed
      // while still connecting. Close it once it opens instead, so the browser
      // does not report a failed connection.
      socket.onmessage = null;
      socket.onerror = null;
      if (socket.readyState === WebSocket.CONNECTING) {
        const pending = socket;
        pending.onopen = () => pending.close();
      } else {
        socket.close();
      }
    };
  }, [range]);

  const formattedPrice =
    price !== null
      ? price.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '---';

  return (
    <div className="bitcoin-widget">
      <div className="bitcoin-header">
        <div className="bitcoin-title">
          Bitcoin / U.S. Dollar
        </div>

        <div className="bitcoin-price">
          {formattedPrice}
          <span>USD</span>
        </div>
      </div>

      <div className="bitcoin-ranges">
        {(Object.keys(ranges) as Range[]).map((item) => (
          <button
            key={item}
            className={range === item ? 'active' : ''}
            onClick={() => setRange(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {loading && (
        <div className="bitcoin-status">
          Loading historical data...
        </div>
      )}

      {error && (
        <div className="bitcoin-status error">
          {error}
        </div>
      )}

      <div
        ref={chartRef}
        className="bitcoin-chart"
      />
    </div>
  );
}

export default PriceChart;

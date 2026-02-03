'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

interface CandlestickChartProps {
  symbol: string;
  ohlcv: Array<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: string;
  }>;
  sma?: number[];
  ema?: number[];
  interval: string;
  availableIntervals: string[];
  onIntervalChange: (interval: string) => void;
}

function CandlestickChartInner({
  symbol,
  ohlcv,
  sma = [],
  ema = [],
  interval,
  availableIntervals,
  onIntervalChange,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const smaSeriesRef = useRef<any>(null);
  const emaSeriesRef = useRef<any>(null);
  const [chartLib, setChartLib] = useState<any>(null);

  const intervals = ['1m', '5m', '1h', '1d'];

  // Load library once on mount
  useEffect(() => {
    import('lightweight-charts').then((mod) => {
      setChartLib(mod);
    });
  }, []);

  // Create chart once when library loads
  useEffect(() => {
    if (!chartContainerRef.current || !chartLib || chartRef.current) return;

    const chart = chartLib.createChart(chartContainerRef.current, {
      layout: {
        background: { type: chartLib.ColorType.Solid, color: '#1f2937' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#374151' },
        horzLines: { color: '#374151' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    const smaSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
    });
    smaSeriesRef.current = smaSeries;

    const emaSeries = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 2,
    });
    emaSeriesRef.current = emaSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartLib]);

  // Update data whenever it changes (instant)
  useEffect(() => {
    if (!candleSeriesRef.current || !smaSeriesRef.current || !emaSeriesRef.current) return;
    if (ohlcv.length === 0) {
      // Clear chart but don't destroy it
      candleSeriesRef.current.setData([]);
      smaSeriesRef.current.setData([]);
      emaSeriesRef.current.setData([]);
      return;
    }

    try {
      const candleData = ohlcv.map((bar) => ({
        time: Math.floor(new Date(bar.timestamp).getTime() / 1000),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));

      candleSeriesRef.current.setData(candleData);

      if (sma.length > 0) {
        const smaData = sma.map((value, idx) => ({
          time: Math.floor(new Date(ohlcv[Math.max(0, ohlcv.length - sma.length + idx)].timestamp).getTime() / 1000),
          value,
        }));
        smaSeriesRef.current.setData(smaData);
      } else {
        smaSeriesRef.current.setData([]);
      }

      if (ema.length > 0) {
        const emaData = ema.map((value, idx) => ({
          time: Math.floor(new Date(ohlcv[Math.max(0, ohlcv.length - ema.length + idx)].timestamp).getTime() / 1000),
          value,
        }));
        emaSeriesRef.current.setData(emaData);
      } else {
        emaSeriesRef.current.setData([]);
      }

      chartRef.current?.timeScale().fitContent();
    } catch (err) {
      console.error('Chart update error:', err);
    }
  }, [ohlcv, sma, ema, symbol, interval]); // Update on symbol/interval change too

  if (!chartLib) {
    return <div className="p-6 text-gray-400">Loading chart...</div>;
  }

  return (
    <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{symbol} Chart</h2>
          <p className="text-sm text-gray-400">
            {ohlcv.length > 0 ? `Candlestick with SMA/EMA overlays (${ohlcv.length} bars)` : 'Waiting for data...'}
          </p>
        </div>
        <div className="flex gap-2">
          {intervals.map((int) => {
            const isAvailable = availableIntervals.includes(int);
            return (
              <button
                key={int}
                onClick={() => isAvailable && onIntervalChange(int)}
                disabled={!isAvailable}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  interval === int && isAvailable
                    ? 'bg-blue-600 text-white'
                    : isAvailable
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                {int}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
}

export default dynamic(() => Promise.resolve(CandlestickChartInner), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-400">Loading chart...</div>,
});

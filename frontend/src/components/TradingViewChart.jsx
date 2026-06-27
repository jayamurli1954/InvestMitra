import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CandlestickSeries, AreaSeries } from 'lightweight-charts';
import { BarChart2, TrendingUp } from 'lucide-react';

const TradingViewChart = ({ data = [], height = 400 }) => {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const seriesInstanceRef = useRef(null);
  const [chartType, setChartType] = useState('candlestick'); // 'candlestick' or 'line'

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const handleResize = () => {
      if (chartInstanceRef.current && chartContainerRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: '#38bdf8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: '#38bdf8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0f172a',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartInstanceRef.current = chart;

    // Process data to fit Lightweight Charts format
    // expects { time: 'YYYY-MM-DD', open, high, low, close } or value
    const formattedData = (data || []).map((item) => {
      // Handle various date formats (ISO string, timestamp, YYYY-MM-DD)
      let timeStr = item.date || item.time;
      if (timeStr && timeStr.includes('T')) {
        timeStr = timeStr.split('T')[0];
      }
      
      const openPrice = item.open ?? item.price ?? item.close ?? 0;
      const highPrice = item.high ?? Math.max(openPrice, item.close ?? openPrice);
      const lowPrice = item.low ?? Math.min(openPrice, item.close ?? openPrice);
      const closePrice = item.close ?? item.price ?? openPrice;

      return {
        time: timeStr || new Date().toISOString().split('T')[0],
        open: Number(openPrice),
        high: Number(highPrice),
        low: Number(lowPrice),
        close: Number(closePrice),
        value: Number(closePrice),
      };
    }).filter(d => d.time && !isNaN(d.close))
      .sort((a, b) => (a.time > b.time ? 1 : -1));

    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      candlestickSeries.setData(formattedData);
      seriesInstanceRef.current = candlestickSeries;
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(14, 165, 233, 0.4)',
        bottomColor: 'rgba(14, 165, 233, 0.0)',
        lineColor: '#0ea5e9',
        lineWidth: 2,
      });
      areaSeries.setData(formattedData.map(d => ({ time: d.time, value: d.value })));
      seriesInstanceRef.current = areaSeries;
    }

    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [data, height, chartType]);


  return (
    <div className="w-full space-y-3">
      {/* Chart Controls Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="font-medium text-slate-200">Chart Type:</span>
        </div>
        <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setChartType('candlestick')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              chartType === 'candlestick'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Candles</span>
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              chartType === 'line'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Area Line</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div
        ref={chartContainerRef}
        className="w-full relative rounded-xl overflow-hidden"
        style={{ height: `${height}px` }}
      />
    </div>
  );
};

export default TradingViewChart;

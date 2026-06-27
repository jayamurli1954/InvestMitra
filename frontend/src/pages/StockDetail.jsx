import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { ArrowLeft, TrendingUp, TrendingDown, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BarChart, Card } from '@tremor/react';
import { Label } from "@/components/ui/label";
import TradingViewChart from '@/components/TradingViewChart';

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exchange, setExchange] = useState('NSE');

  useEffect(() => {
    fetchStockData();
  }, [symbol]);

  const fetchStockData = async () => {
    try {
      const [stockRes, historyRes] = await Promise.all([
        axios.get(`${API}/stocks/${symbol}?exchange=${exchange}`),
        axios.get(`${API}/stocks/${symbol}/historical?days=30&exchange=${exchange}`)
      ]);
      setStock(stockRes.data);
      setHistoricalData(historyRes.data);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async () => {
    try {
      await axios.post(`${API}/watchlist`, {
        symbol: stock.symbol,
        name: stock.name
      });
      toast.success('Added to watchlist');
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Stock not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in" data-testid="stock-detail-page">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-2">
            <Label className="text-slate-300">Exchange:</Label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="NSE">NSE</option>
              <option value="NYSE">NYSE</option>
              <option value="NASDAQ">NASDAQ</option>
            </select>
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2" data-testid="stock-symbol">{stock.symbol}</h1>
            <p className="text-xl text-slate-400 mb-2">{stock.name}</p>
            <div className="flex items-center space-x-4">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                {stock.exchange}
              </span>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm font-medium">
                {stock.sector}
              </span>
            </div>
          </div>
          <Button
            onClick={addToWatchlist}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="add-watchlist-btn"
          >
            <Eye className="w-4 h-4 mr-2" />
            Add to Watchlist
          </Button>
        </div>
      </div>

      {/* Price Info */}
      <div className="glass-card p-8" data-testid="price-info">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-2">Current Price</p>
            <p className="text-5xl font-bold text-white mb-2" data-testid="current-price">₹{stock.current_price.toFixed(2)}</p>
            <div className={`flex items-center space-x-2 ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stock.change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="text-xl font-medium" data-testid="price-change">
                {stock.change >= 0 ? '+' : ''}₹{stock.change.toFixed(2)} ({stock.change_percent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400 mb-1">52W High</p>
            <p className="text-xl font-medium text-white mb-3">₹{stock.week_52_high.toFixed(2)}</p>
            <p className="text-sm text-slate-400 mb-1">52W Low</p>
            <p className="text-xl font-medium text-white">₹{stock.week_52_low.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Fundamentals & Technical Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fundamentals */}
        <div className="glass-card p-6" data-testid="fundamentals">
          <h2 className="text-2xl font-bold text-white mb-6">Fundamentals</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">Market Cap</span>
              <span className="text-white font-medium" data-testid="market-cap">₹{(stock.market_cap / 10000000).toFixed(2)} Cr</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">P/E Ratio</span>
              <span className="text-white font-medium" data-testid="pe-ratio">{stock.pe_ratio?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">P/B Ratio</span>
              <span className="text-white font-medium" data-testid="pb-ratio">{stock.pb_ratio?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">ROE</span>
              <span className="text-white font-medium" data-testid="roe">{stock.roe?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">Debt to Equity</span>
              <span className="text-white font-medium" data-testid="de-ratio">{stock.debt_to_equity?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Dividend Yield</span>
              <span className="text-white font-medium" data-testid="div-yield">{stock.dividend_yield?.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Technical Indicators */}
        <div className="glass-card p-6" data-testid="technical-indicators">
          <h2 className="text-2xl font-bold text-white mb-6">Technical Indicators</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">Volume</span>
              <span className="text-white font-medium" data-testid="volume">{(stock.volume / 1000000).toFixed(2)}M</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">RSI (14)</span>
              <span className={`font-medium ${
                stock.rsi > 70 ? 'text-rose-400' : stock.rsi < 30 ? 'text-emerald-400' : 'text-white'
              }`} data-testid="rsi">
                {stock.rsi?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <span className="text-slate-400">50 Day MA</span>
              <span className="text-white font-medium" data-testid="ma-50">₹{stock.ma_50?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">200 Day MA</span>
              <span className="text-white font-medium" data-testid="ma-200">₹{stock.ma_200?.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-400 font-medium">Analysis Insight</p>
            <p className="text-sm text-slate-300 mt-1">
              {stock.rsi > 70 ? 'Stock is in overbought territory' : 
               stock.rsi < 30 ? 'Stock is in oversold territory' : 
               'Stock is trading in neutral zone'}
            </p>
          </div>
        </div>
      </div>

      {/* TradingView Technical Price Chart */}
      <div className="glass-card p-6" data-testid="price-chart">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Interactive Candlestick Chart</h2>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            TradingView Engine
          </span>
        </div>
        {historicalData.length > 0 ? (
          <TradingViewChart data={historicalData} height={420} />
        ) : (
          <p className="text-slate-400 text-center py-8">No historical data available</p>
        )}
      </div>

      {/* Volume Chart */}
      <div className="glass-card p-6" data-testid="volume-chart">
        <h2 className="text-2xl font-bold text-white mb-6">Trading Volume</h2>
        {historicalData.length > 0 ? (
          <BarChart
            data={historicalData.map(d => ({
              date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              Volume: Math.round(d.volume / 1000000) // Convert to millions
            }))}
            index="date"
            categories={["Volume"]}
            colors={["cyan"]}
            valueFormatter={(value) => `${value}M`}
            yAxisWidth={50}
            className="h-64"
            showAnimation={true}
            showLegend={false}
          />
        ) : (
          <p className="text-slate-400 text-center py-8">No volume data available</p>
        )}
      </div>

      {/* Historical Data Table (Last 10 Days) */}
      <div className="glass-card p-6" data-testid="historical-data">
        <h2 className="text-2xl font-bold text-white mb-6">Recent Price History</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Open</th>
                <th>High</th>
                <th>Low</th>
                <th>Close</th>
                <th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {[...historicalData].reverse().slice(0, 10).map((data, idx) => (
                <tr key={idx} data-testid={`history-row-${idx}`}>
                  <td className="text-white">{data.date}</td>
                  <td className="text-slate-300">₹{data.open.toFixed(2)}</td>
                  <td className="text-emerald-400">₹{data.high.toFixed(2)}</td>
                  <td className="text-rose-400">₹{data.low.toFixed(2)}</td>
                  <td className="text-white font-medium">₹{data.close.toFixed(2)}</td>
                  <td className="text-slate-300">{(data.volume / 1000000).toFixed(2)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockDetail;
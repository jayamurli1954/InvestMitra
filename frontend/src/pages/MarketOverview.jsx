import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const MarketOverview = () => {
  const [marketIndices, setMarketIndices] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const [indicesRes, stocksRes] = await Promise.all([
        axios.get(`${API}/market/overview`),
        axios.get(`${API}/stocks/all`)
      ]);
      setMarketIndices(indicesRes.data);
      
      // Get detailed data for top stocks
      const stockDetails = await Promise.all(
        stocksRes.data.slice(0, 10).map(stock => 
          axios.get(`${API}/stocks/${stock.symbol}`)
        )
      );
      setTopStocks(stockDetails.map(res => res.data));
    } catch (error) {
      console.error('Error fetching market data:', error);
      toast.error('Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const gainers = [...topStocks].sort((a, b) => b.change_percent - a.change_percent).slice(0, 5);
  const losers = [...topStocks].sort((a, b) => a.change_percent - b.change_percent).slice(0, 5);

  return (
    <div className="space-y-8 fade-in" data-testid="market-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2" data-testid="market-title">Market Overview</h1>
        <p className="text-slate-400">Real-time insights into Indian stock market performance</p>
      </div>

      {/* Market Indices */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Major Indices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketIndices.map((index, idx) => (
            <div key={idx} className="glass-card p-6 fade-in" data-testid={`index-card-${idx}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400 font-medium">{index.name}</p>
                {index.change >= 0 ? (
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  </div>
                )}
              </div>
              <p className="text-3xl font-bold text-white mb-2" data-testid={`index-value-${idx}`}>
                {index.value.toLocaleString('en-IN')}
              </p>
              <div className={`flex items-center space-x-1 ${index.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {index.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span className="text-sm font-medium" data-testid={`index-change-${idx}`}>
                  {Math.abs(index.change).toFixed(2)} ({index.change_percent >= 0 ? '+' : ''}{index.change_percent.toFixed(2)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Gainers & Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="glass-card p-6" data-testid="top-gainers">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Top Gainers</h2>
          </div>
          <div className="space-y-3">
            {gainers.map((stock, idx) => (
              <Link key={idx} to={`/stock/${stock.symbol}`}>
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-testid={`gainer-${idx}`}>
                  <div>
                    <p className="font-medium text-white">{stock.symbol}</p>
                    <p className="text-sm text-slate-400">₹{stock.current_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-emerald-400">
                      <ArrowUpRight className="w-4 h-4" />
                      <span className="font-medium" data-testid={`gainer-change-${idx}`}>+{stock.change_percent.toFixed(2)}%</span>
                    </div>
                    <p className="text-sm text-slate-400">+₹{stock.change.toFixed(2)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div className="glass-card p-6" data-testid="top-losers">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-rose-500/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Top Losers</h2>
          </div>
          <div className="space-y-3">
            {losers.map((stock, idx) => (
              <Link key={idx} to={`/stock/${stock.symbol}`}>
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-testid={`loser-${idx}`}>
                  <div>
                    <p className="font-medium text-white">{stock.symbol}</p>
                    <p className="text-sm text-slate-400">₹{stock.current_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1 text-rose-400">
                      <ArrowDownRight className="w-4 h-4" />
                      <span className="font-medium" data-testid={`loser-change-${idx}`}>{stock.change_percent.toFixed(2)}%</span>
                    </div>
                    <p className="text-sm text-slate-400">₹{stock.change.toFixed(2)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Performance */}
      <div className="glass-card p-6" data-testid="sector-performance">
        <h2 className="text-2xl font-bold text-white mb-6">Sector Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'Banking', change: 0.45, color: 'emerald' },
            { name: 'IT', change: 0.92, color: 'emerald' },
            { name: 'Energy', change: -0.23, color: 'rose' },
            { name: 'Pharma', change: 0.18, color: 'emerald' },
            { name: 'FMCG', change: -0.11, color: 'rose' },
            { name: 'Auto', change: 0.34, color: 'emerald' },
          ].map((sector, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-white/5" data-testid={`sector-${idx}`}>
              <p className="text-sm text-slate-400 mb-2">{sector.name}</p>
              <p className={`text-lg font-bold ${sector.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid={`sector-change-${idx}`}>
                {sector.change >= 0 ? '+' : ''}{sector.change}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Market Insights */}
      <div className="glass-card p-6" data-testid="market-insights">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Market Insights</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-sm text-emerald-400 font-medium mb-2">Bullish Signal</p>
            <p className="text-sm text-slate-300">NIFTY 50 shows strong momentum with consistent higher highs</p>
          </div>
          
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-400 font-medium mb-2">Sector Focus</p>
            <p className="text-sm text-slate-300">IT sector outperforming with robust fundamentals and exports</p>
          </div>
          
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-sm text-purple-400 font-medium mb-2">Investment Tip</p>
            <p className="text-sm text-slate-300">Consider diversifying across sectors to manage portfolio risk</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import {
  TrendingUp, TrendingDown, Briefcase, Eye, ArrowUpRight, ArrowDownRight,
  Filter, Target, BarChart3, Plus, FileText, ChevronDown, ChevronUp, PieChart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/SkeletonLoader';

const Dashboard = () => {
  const [marketIndices, setMarketIndices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolioPerformance, setPortfolioPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMarketIndices, setShowMarketIndices] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [indicesRes, portfolioRes, watchlistRes, performanceRes] = await Promise.all([
        axios.get(`${API}/market/overview`),
        axios.get(`${API}/portfolio`),
        axios.get(`${API}/watchlist`),
        axios.get(`${API}/portfolio/performance`)
      ]);

      setMarketIndices(indicesRes.data);
      setPortfolio(portfolioRes.data);
      setWatchlist(watchlistRes.data);
      setPortfolioPerformance(performanceRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate sector allocation from portfolio
  const calculateSectorAllocation = () => {
    if (!portfolio || portfolio.length === 0) return [];

    const sectorTotals = {};
    let totalValue = 0;

    portfolio.forEach(holding => {
      if (holding.asset_type !== 'MUTUAL_FUND') {
        const value = holding.current_price * holding.quantity;
        const sector = holding.sector || 'Other';
        sectorTotals[sector] = (sectorTotals[sector] || 0) + value;
        totalValue += value;
      }
    });

    return Object.entries(sectorTotals)
      .map(([sector, value]) => ({
        sector,
        value,
        percentage: (value / totalValue * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 sectors
  };

  const sectorAllocation = calculateSectorAllocation();

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2" data-testid="dashboard-title">Investment Dashboard</h1>
        <p className="text-slate-400">Your portfolio at a glance</p>
      </div>

      {/* HERO: Portfolio Summary - BIG and BOLD */}
      {portfolioPerformance && (
        <div className="glass-card p-8 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20" data-testid="portfolio-summary">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Portfolio Value</h2>
                <p className="text-slate-400">Your investment overview</p>
              </div>
            </div>
            <Link to="/portfolio" data-testid="view-portfolio-link">
              <button className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-semibold transition-all shadow-lg shadow-emerald-500/20">
                View Full Portfolio
              </button>
            </Link>
          </div>

          {/* Big Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
              <p className="text-sm text-slate-400 uppercase tracking-wide font-medium">Current Value</p>
              <p className="text-5xl font-bold text-white" data-testid="current-value">
                ₹{portfolioPerformance.total_current.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-400 uppercase tracking-wide font-medium">Total Invested</p>
              <p className="text-5xl font-bold text-white" data-testid="total-invested">
                ₹{portfolioPerformance.total_invested.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-400 uppercase tracking-wide font-medium">Total Gain/Loss</p>
              <p className={`text-5xl font-bold ${portfolioPerformance.total_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid="total-gain">
                {portfolioPerformance.total_gain >= 0 ? '+' : ''}₹{Math.abs(portfolioPerformance.total_gain).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-400 uppercase tracking-wide font-medium">Returns</p>
              <div className={`flex items-center space-x-3 ${portfolioPerformance.total_gain_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {portfolioPerformance.total_gain_percent >= 0 ? (
                  <TrendingUp className="w-10 h-10" />
                ) : (
                  <TrendingDown className="w-10 h-10" />
                )}
                <p className="text-5xl font-bold" data-testid="total-gain-percent">
                  {portfolioPerformance.total_gain_percent >= 0 ? '+' : ''}{portfolioPerformance.total_gain_percent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/portfolio" data-testid="quick-action-add-stock">
          <div className="glass-card p-6 hover:scale-105 transition-transform cursor-pointer border-2 border-emerald-500/30 hover:border-emerald-500">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Add Stock</h3>
            <p className="text-sm text-slate-400">Add holdings to portfolio</p>
          </div>
        </Link>

        <Link to="/performance" data-testid="quick-action-reports">
          <div className="glass-card p-6 hover:scale-105 transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Reports</h3>
            <p className="text-sm text-slate-400">View performance reports</p>
          </div>
        </Link>

        <Link to="/screener" data-testid="quick-action-screener">
          <div className="glass-card p-6 hover:scale-105 transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3">
              <Filter className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Stock Screener</h3>
            <p className="text-sm text-slate-400">Find investment opportunities</p>
          </div>
        </Link>

        <Link to="/analytics" data-testid="quick-action-analytics">
          <div className="glass-card p-6 hover:scale-105 transition-transform cursor-pointer">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-3">
              <BarChart3 className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Analytics</h3>
            <p className="text-sm text-slate-400">Deep portfolio analysis</p>
          </div>
        </Link>
      </div>

      {/* Asset Allocation */}
      {sectorAllocation.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Sector Allocation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {sectorAllocation.map((sector, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-slate-400 mb-1">{sector.sector}</p>
                <p className="text-2xl font-bold text-white">{sector.percentage}%</p>
                <p className="text-xs text-slate-500 mt-1">₹{sector.value.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Indices - Collapsible & Secondary */}
      <div className="glass-card p-6">
        <button
          onClick={() => setShowMarketIndices(!showMarketIndices)}
          className="w-full flex items-center justify-between text-left group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-500/20 rounded-lg flex items-center justify-center group-hover:bg-slate-500/30 transition-colors">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Market Indices</h2>
              <p className="text-sm text-slate-400">Global market overview</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">
              {showMarketIndices ? 'Hide' : 'Show'}
            </span>
            {showMarketIndices ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </button>

        {showMarketIndices && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 fade-in">
            {marketIndices.map((index, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors" data-testid={`market-index-${idx}`}>
                <p className="text-sm text-slate-400 mb-2">{index.name}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold text-white">{index.value.toLocaleString('en-IN')}</p>
                    <div className={`flex items-center space-x-1 mt-1 ${index.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {index.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span className="text-xs font-medium">{Math.abs(index.change).toFixed(2)} ({index.change_percent.toFixed(2)}%)</span>
                    </div>
                  </div>
                  {index.change >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-emerald-400/30" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-rose-400/30" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Holdings & Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Holdings */}
        <div className="glass-card p-6" data-testid="recent-holdings">
          <h3 className="text-xl font-bold text-white mb-4">Recent Holdings</h3>
          {portfolio.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No holdings yet</p>
              <Link to="/portfolio">
                <button className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 font-medium" data-testid="add-first-holding-btn">
                  Add Your First Holding
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {portfolio.slice(0, 5).map((holding, idx) => {
                const gain = (holding.current_price - holding.purchase_price) * holding.quantity;
                const gainPercent = ((holding.current_price - holding.purchase_price) / holding.purchase_price) * 100;
                const displayName = holding.asset_type === 'MUTUAL_FUND'
                  ? (holding.scheme_name || holding.scheme_code)
                  : (holding.name || holding.symbol);
                const displaySymbol = holding.asset_type === 'MUTUAL_FUND'
                  ? holding.scheme_code
                  : holding.symbol;
                const unit = holding.asset_type === 'MUTUAL_FUND' ? 'units' : 'shares';

                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors" data-testid={`holding-${idx}`}>
                    <div>
                      <p className="font-medium text-white">{displayName}</p>
                      <p className="text-sm text-slate-400">{holding.quantity} {unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">₹{holding.current_price.toFixed(2)}</p>
                      <p className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {gain >= 0 ? '+' : ''}₹{gain.toFixed(2)} ({gainPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="glass-card p-6" data-testid="watchlist">
          <h3 className="text-xl font-bold text-white mb-4">Watchlist</h3>
          {watchlist.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">Your watchlist is empty</p>
              <Link to="/screener">
                <button className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-medium" data-testid="add-to-watchlist-btn">
                  Discover Stocks
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {watchlist.slice(0, 5).map((item, idx) => (
                <Link key={idx} to={`/stock/${item.symbol}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-testid={`watchlist-item-${idx}`}>
                    <div>
                      <p className="font-medium text-white">{item.symbol}</p>
                      <p className="text-sm text-slate-400">{item.name}</p>
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

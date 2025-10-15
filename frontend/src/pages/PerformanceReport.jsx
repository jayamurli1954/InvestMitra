import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { TrendingUp, TrendingDown, Activity, Target, Award, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LineChart, BarChart as TremorBarChart, AreaChart } from '@tremor/react';

const PerformanceReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/performance/report`);
      setReport(response.data);
    } catch (error) {
      console.error('Error fetching performance report:', error);
      toast.error('Failed to load performance report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!report || !report.summary) {
    return (
      <div className="glass-card p-12 text-center">
        <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Performance Data</h3>
        <p className="text-slate-400">Add transactions and holdings to generate performance reports</p>
      </div>
    );
  }

  const { summary, annualized_returns, risk_metrics, sector_performance, benchmark_comparison, monthly_returns } = report;

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Performance Report</h1>
          <p className="text-slate-400">Comprehensive analysis of your portfolio performance</p>
        </div>
        <Button
          onClick={fetchReport}
          variant="outline"
          className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Return</span>
            {summary.total_return_percent >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )}
          </div>
          <p className={`text-3xl font-bold ${summary.total_return_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.total_return_percent >= 0 ? '+' : ''}{summary.total_return_percent.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            ₹{summary.absolute_gain.toFixed(2)} gain
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">CAGR</span>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <p className={`text-3xl font-bold ${annualized_returns.cagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {annualized_returns.cagr >= 0 ? '+' : ''}{annualized_returns.cagr}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Over {annualized_returns.years} years
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Sharpe Ratio</span>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <p className={`text-3xl font-bold ${
            risk_metrics.sharpe_ratio > 1 ? 'text-emerald-400' : 
            risk_metrics.sharpe_ratio > 0 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {risk_metrics.sharpe_ratio.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {risk_metrics.sharpe_ratio > 1 ? 'Excellent' : risk_metrics.sharpe_ratio > 0 ? 'Good' : 'Poor'}
          </p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Volatility</span>
            <Activity className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">
            {risk_metrics.volatility.toFixed(2)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Annualized
          </p>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Investment Summary */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Investment Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <span className="text-slate-400">Total Invested</span>
              <span className="text-white font-bold text-lg">₹{summary.total_invested.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <span className="text-slate-400">Current Value</span>
              <span className="text-white font-bold text-lg">₹{summary.current_value.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <span className="text-emerald-400 font-medium">Absolute Gain</span>
              <span className={`font-bold text-lg ${summary.absolute_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{summary.absolute_gain.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <span className="text-blue-400 font-medium">Time Period</span>
              <span className="text-white font-bold text-lg">{summary.time_period_years.toFixed(2)} years</span>
            </div>
          </div>
        </div>

        {/* Benchmark Comparison */}
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Benchmark Comparison</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <span className="text-slate-400">Your Portfolio</span>
              <span className={`font-bold text-lg ${benchmark_comparison.portfolio_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {benchmark_comparison.portfolio_return >= 0 ? '+' : ''}{benchmark_comparison.portfolio_return}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
              <span className="text-slate-400">Nifty 50 (Benchmark)</span>
              <span className="text-white font-bold text-lg">+{benchmark_comparison.benchmark_return}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <span className="text-purple-400 font-medium">Alpha (Outperformance)</span>
              <span className={`font-bold text-lg ${benchmark_comparison.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {benchmark_comparison.alpha >= 0 ? '+' : ''}{benchmark_comparison.alpha}%
              </span>
            </div>
            <div className={`flex items-center justify-center p-3 rounded-lg ${
              benchmark_comparison.outperformance 
                ? 'bg-emerald-500/10 border border-emerald-500/20' 
                : 'bg-rose-500/10 border border-rose-500/20'
            }`}>
              <span className={`font-bold ${benchmark_comparison.outperformance ? 'text-emerald-400' : 'text-rose-400'}`}>
                {benchmark_comparison.relative_performance}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Metrics Details */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Risk Metrics Explained</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Sharpe Ratio</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Measures risk-adjusted return. Higher is better.
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• &gt;1.0: Excellent</li>
              <li>• 0.5-1.0: Good</li>
              <li>• &lt;0.5: Suboptimal</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Activity className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Volatility</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Standard deviation of returns. Lower means more stable.
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• &lt;15%: Low volatility</li>
              <li>• 15-25%: Moderate</li>
              <li>• &gt;25%: High volatility</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Activity className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">CAGR</h3>
            </div>
            <p className="text-sm text-slate-400 mb-2">
              Compound Annual Growth Rate. Smoothed average return.
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• &gt;15%: Excellent</li>
              <li>• 10-15%: Good</li>
              <li>• &lt;10%: Below average</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sector Performance */}
      {sector_performance && sector_performance.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Sector Performance</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Sector</th>
                  <th>Stocks</th>
                  <th>Invested</th>
                  <th>Current Value</th>
                  <th>Gain/Loss</th>
                  <th>Return %</th>
                </tr>
              </thead>
              <tbody>
                {sector_performance.map((sector, idx) => (
                  <tr key={idx}>
                    <td className="text-white font-medium">{sector.sector}</td>
                    <td className="text-white">{sector.stocks}</td>
                    <td className="text-white">₹{sector.invested.toFixed(2)}</td>
                    <td className="text-white">₹{sector.current_value.toFixed(2)}</td>
                    <td className={sector.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      ₹{sector.gain.toFixed(2)}
                    </td>
                    <td className={sector.gain_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {sector.gain_percent >= 0 ? '+' : ''}{sector.gain_percent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Returns Chart */}
      {monthly_returns && monthly_returns.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Portfolio Value Over Time</h2>
          <AreaChart
            data={monthly_returns}
            index="month"
            categories={["value"]}
            colors={["emerald"]}
            valueFormatter={(value) => `₹${value.toFixed(2)}`}
            yAxisWidth={80}
            className="h-80"
            showAnimation={true}
            showLegend={false}
          />
        </div>
      )}

      {/* Info Banner */}
      <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start space-x-3">
          <Info className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">About This Report</h3>
            <p className="text-sm text-slate-400 mb-2">
              This performance report is calculated based on your transaction history and current portfolio holdings.
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• CAGR assumes continuous compounding</li>
              <li>• Sharpe Ratio uses 6.5% risk-free rate (India)</li>
              <li>• Benchmark comparison uses approximate Nifty 50 returns</li>
              <li>• Volatility is annualized based on monthly returns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReport;

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { 
  TrendingUp, TrendingDown, Target, AlertCircle, Lightbulb, 
  PieChart, BarChart3, RefreshCw, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DonutChart, BarChart as TremorBarChart, Card } from '@tremor/react';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [rebalanceSuggestions, setRebalanceSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    fetchRecommendations();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/portfolio`);
      console.log('Analytics data received:', response.data);
      console.log('Sector allocation:', response.data.sector_allocation);
      console.log('Top performers:', response.data.top_performers);
      console.log('Bottom performers:', response.data.bottom_performers);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`${API}/analytics/recommendations`);
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleRebalance = async () => {
    // Default target: Equal weight across sectors
    const targetAllocation = {
      "Banking": 20,
      "IT": 20,
      "Energy": 15,
      "Power": 15,
      "Infrastructure": 15,
      "Other": 15
    };

    try {
      const response = await axios.post(`${API}/analytics/rebalance`, targetAllocation);
      setRebalanceSuggestions(response.data.suggestions);
      toast.success('Rebalancing suggestions generated!');
    } catch (error) {
      console.error('Error generating rebalancing:', error);
      toast.error('Failed to generate suggestions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const getRiskColor = (level) => {
    switch(level) {
      case 'Low': return 'text-emerald-400';
      case 'Medium': return 'text-yellow-400';
      case 'High': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-8 fade-in" data-testid="analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="analytics-title">
            Portfolio Analytics
          </h1>
          <p className="text-slate-400">Advanced insights and AI-powered recommendations</p>
        </div>
        <Button
          onClick={fetchAnalytics}
          className="bg-blue-500 hover:bg-blue-600 text-white"
          data-testid="refresh-analytics-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {analytics && analytics.num_holdings > 0 ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-6" data-testid="diversification-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">Diversification Score</p>
                <PieChart className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{analytics.diversification_score}/100</p>
              <p className="text-sm text-slate-400">{analytics.num_holdings} holdings, {analytics.num_sectors} sectors</p>
            </div>

            <div className="glass-card p-6" data-testid="risk-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">Risk Level</p>
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <p className={`text-3xl font-bold mb-1 ${getRiskColor(analytics.risk_level)}`}>
                {analytics.risk_level}
              </p>
              <p className="text-sm text-slate-400">Concentration: {analytics.concentration_risk}</p>
            </div>

            <div className="glass-card p-6" data-testid="top-performer-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">Top Performer</p>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              {analytics.top_performers[0] && (
                <>
                  <p className="text-2xl font-bold text-white mb-1">{analytics.top_performers[0].symbol}</p>
                  <p className="text-emerald-400 font-medium">
                    +{analytics.top_performers[0].gain_percent.toFixed(2)}%
                  </p>
                </>
              )}
            </div>

            <div className="glass-card p-6" data-testid="bottom-performer-card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-400">Needs Attention</p>
                <TrendingDown className="w-5 h-5 text-rose-400" />
              </div>
              {analytics.bottom_performers[0] && (
                <>
                  <p className="text-2xl font-bold text-white mb-1">{analytics.bottom_performers[0].symbol}</p>
                  <p className="text-rose-400 font-medium">
                    {analytics.bottom_performers[0].gain_percent.toFixed(2)}%
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Sector Allocation Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="glass-card p-6" data-testid="sector-donut-chart">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <PieChart className="w-6 h-6 mr-3 text-purple-400" />
                Sector Distribution
              </h2>
              {Object.keys(analytics.sector_allocation).length > 0 ? (
                <DonutChart
                  data={Object.entries(analytics.sector_allocation).map(([sector, percent]) => ({
                    name: sector,
                    value: Number(percent)
                  }))}
                  category="value"
                  index="name"
                  valueFormatter={(value) => `${value.toFixed(1)}%`}
                  colors={["emerald", "blue", "violet", "amber", "rose", "cyan", "indigo", "purple"]}
                  className="h-72"
                  showAnimation={true}
                  showLabel={true}
                  showTooltip={true}
                />
              ) : (
                <p className="text-slate-400 text-center py-8">No sector data available</p>
              )}
            </div>

            {/* Bar Chart */}
            <div className="glass-card p-6" data-testid="sector-bar-chart">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 text-purple-400" />
                Sector Allocation
              </h2>
              {Object.keys(analytics.sector_allocation).length > 0 ? (
                <TremorBarChart
                  data={Object.entries(analytics.sector_allocation).map(([sector, percent]) => ({
                    sector: sector,
                    Allocation: Number(percent)
                  }))}
                  index="sector"
                  categories={["Allocation"]}
                  colors={["emerald"]}
                  valueFormatter={(value) => `${value.toFixed(1)}%`}
                  yAxisWidth={80}
                  className="h-72"
                  showAnimation={true}
                  showLegend={false}
                  showTooltip={true}
                />
              ) : (
                <p className="text-slate-400 text-center py-8">No sector data available</p>
              )}
            </div>
          </div>

          {/* Performance Chart */}
          <div className="glass-card p-6" data-testid="performance-chart">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-3 text-emerald-400" />
              Stock Performance
            </h2>
            {analytics.top_performers && analytics.top_performers.length > 0 ? (
              <TremorBarChart
                data={[
                  ...analytics.top_performers.slice(0, 3).map(p => ({
                    stock: p.symbol,
                    "Gain/Loss %": Number(p.gain_percent)
                  })),
                  ...(analytics.bottom_performers && analytics.bottom_performers.length > 0 
                    ? analytics.bottom_performers.slice(-3).reverse().map(p => ({
                        stock: p.symbol,
                        "Gain/Loss %": Number(p.gain_percent)
                      }))
                    : [])
                ]}
                index="stock"
                categories={["Gain/Loss %"]}
                colors={["emerald"]}
                valueFormatter={(value) => `${value.toFixed(2)}%`}
                yAxisWidth={100}
                className="h-72"
                showAnimation={true}
                showLegend={false}
                showTooltip={true}
              />
            ) : (
              <p className="text-slate-400 text-center py-8">Add stocks to your portfolio to see performance metrics</p>
            )}
          </div>

          {/* Rebalancing Suggestions */}
          <div className="glass-card p-6" data-testid="rebalancing-section">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Target className="w-6 h-6 mr-3 text-blue-400" />
                Portfolio Rebalancing
              </h2>
              <Button
                onClick={handleRebalance}
                className="bg-blue-500 hover:bg-blue-600 text-white"
                data-testid="generate-rebalance-btn"
              >
                Generate Suggestions
              </Button>
            </div>

            {rebalanceSuggestions.length > 0 ? (
              <div className="space-y-3">
                {rebalanceSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-800 rounded-lg border-l-4"
                    style={{
                      borderLeftColor:
                        suggestion.priority === 'High'
                          ? '#ef4444'
                          : suggestion.priority === 'Medium'
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                    data-testid={`rebalance-${idx}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-bold text-white">{suggestion.sector}</h4>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              suggestion.action === 'Buy'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {suggestion.action}
                          </span>
                          <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                            {suggestion.priority} Priority
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Current</p>
                            <p className="text-white font-medium">{suggestion.current_percent}%</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Target</p>
                            <p className="text-white font-medium">{suggestion.target_percent}%</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Amount</p>
                            <p className="text-white font-medium">
                              ₹{suggestion.amount.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800/50 rounded-lg">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Click "Generate Suggestions" to get rebalancing recommendations</p>
              </div>
            )}
          </div>

          {/* AI Stock Recommendations */}
          <div className="glass-card p-6" data-testid="recommendations-section">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Lightbulb className="w-6 h-6 mr-3 text-yellow-400" />
              AI-Powered Stock Recommendations
            </h2>

            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 bg-slate-800 rounded-lg" data-testid={`recommendation-${idx}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-lg font-bold text-white">{rec.symbol}</h4>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {rec.sector}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              rec.recommendation === 'Strong Buy'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {rec.recommendation}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400">{rec.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">₹{rec.current_price.toFixed(2)}</p>
                        <p className={rec.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {rec.change_percent >= 0 ? '+' : ''}
                          {rec.change_percent.toFixed(2)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-slate-500">P/E Ratio</p>
                        <p className="text-white font-medium">{rec.pe_ratio?.toFixed(2) || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">ROE</p>
                        <p className="text-white font-medium">{rec.roe?.toFixed(2) || 'N/A'}%</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Match Score</p>
                        <p className="text-emerald-400 font-medium">{rec.score}/100</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {rec.reasons.map((reason, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs"
                        >
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-800/50 rounded-lg">
                <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No recommendations available. Create a strategy first!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
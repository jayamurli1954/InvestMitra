import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Sparkles, TrendingUp, AlertTriangle, Target, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PersonaSelector from '@/components/PersonaSelector';

// Helper function to render data that might be string, array, or object
const renderContent = (data) => {
  if (typeof data === 'string') {
    return <p className="text-slate-300">{data}</p>;
  }

  if (Array.isArray(data)) {
    return data.map((item, idx) => (
      <div key={idx} className="mb-2 last:mb-0">
        {typeof item === 'string' ? (
          <p className="text-slate-300">{item}</p>
        ) : (
          <pre className="text-slate-300 whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
        )}
      </div>
    ));
  }

  if (typeof data === 'object' && data !== null) {
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <p className="text-blue-300 font-semibold capitalize mb-1">
              {key.replace(/_/g, ' ')}:
            </p>
            <p className="text-slate-300 ml-4">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-slate-300">{String(data)}</p>;
};

const AIInsights = () => {
  const [activePersona, setActivePersona] = useState('buffett');
  const [personaAnalysis, setPersonaAnalysis] = useState(null);
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [mlData, setMlData] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState({ optimization: false, predictions: false, mlData: true, opportunities: true });

  const fetchMlData = async (forceRefresh = false) => {
    setLoading(prev => ({ ...prev, mlData: true }));
    try {
      const endpoint = forceRefresh ? `${API}/ai/ml-predictions?refresh=true` : `${API}/ai/ml-predictions`;
      if (forceRefresh) {
        toast.info('Triggered new AI computations. This takes ~30 seconds...', { id: 'ml-refresh' });
      }
      const response = await axios.get(endpoint);
      if (response.data && response.data.predictions) {
        setMlData(response.data.predictions);
        if (forceRefresh) toast.success('New ML models computed and loaded!', { id: 'ml-refresh' });
      }
    } catch (error) {
      console.error('Error fetching ML predictions:', error);
      if (forceRefresh) toast.error('Failed to trigger ML engine', { id: 'ml-refresh' });
    } finally {
      setLoading(prev => ({ ...prev, mlData: false }));
    }
  };

  const fetchOpportunities = async () => {
    setLoading(prev => ({ ...prev, opportunities: true }));
    try {
      const response = await axios.get(`${API}/ai/opportunities`);
      if (response.data && response.data.opportunities) {
        setOpportunities(response.data.opportunities);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(prev => ({ ...prev, opportunities: false }));
    }
  };

  useEffect(() => {
    fetchMlData();
    fetchOpportunities();
  }, []);

  const fetchOptimization = async () => {
    setLoading({ ...loading, optimization: true });
    try {
      const response = await axios.post(`${API}/ai/portfolio-optimization`);
      setOptimization(response.data);
      toast.success('AI optimization generated');
    } catch (error) {
      console.error('Error fetching optimization:', error);
      toast.error('Failed to generate AI insights');
    } finally {
      setLoading({ ...loading, optimization: false });
    }
  };

  const fetchPredictions = async () => {
    setLoading({ ...loading, predictions: true });
    try {
      const response = await axios.post(`${API}/ai/predictive-insights`);
      setPredictions(response.data);
      toast.success('Predictions generated');
    } catch (error) {
      console.error('Error fetching predictions:', error);
      toast.error('Failed to generate predictions');
    } finally {
      setLoading({ ...loading, predictions: false });
    }
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <Sparkles className="w-10 h-10 mr-3 text-amber-400" />
            AI-Powered Insights
          </h1>
          <p className="text-slate-400">Get personalized recommendations powered by AI</p>
        </div>
      </div>

      {/* Investor Personas Component */}
      <PersonaSelector activePersona={activePersona} onSelectPersona={(p) => setActivePersona(p)} />


      {/* Quantitative ML Predictions */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
              <Target className="w-6 h-6 mr-3 text-rose-400" />
              Quantitative Portfolio Risk Intelligence
            </h2>
            <p className="text-slate-400 text-sm">
              An algorithmic snapshot evaluating predictive risk scaling (1-10), momentum trend, and forecasted 30-day Monte Carlo price scenarios.
            </p>
          </div>
          <Button
            onClick={() => fetchMlData(true)}
            disabled={loading.mlData}
            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading.mlData ? 'animate-spin' : ''}`} />
            Refresh Models
          </Button>
        </div>
        {loading.mlData ? (
          <div className="flex justify-center p-8">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : mlData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mlData.map((item, idx) => (
              <div key={idx} className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white">{item.symbol}</h3>
                    {item.current_price && (
                      <span className="text-sm font-medium text-slate-400">
                        ₹{item.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.ai_rating >= 7 ? 'bg-emerald-500/20 text-emerald-400' :
                      item.ai_rating >= 4 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                      ★ {item.ai_rating}/10
                    </span>
                    {item.signal && (
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                        item.signal === 'ACCUMULATE' || item.signal === 'FAVORABLE OUTLOOK' || item.signal.includes('FAVORABLE') || item.signal.includes('POSITIVE')
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/50' :
                        item.signal === 'HOLD' || item.signal === 'BALANCED POSITION' || item.signal.includes('BALANCED') || item.signal.includes('NEUTRAL')
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/50' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/50'
                        }`}>
                        {item.signal}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Risk Score</span>
                      <span className="font-medium text-slate-200">{item.risk_score}/10</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${item.risk_score > 7 ? 'bg-rose-500' :
                        item.risk_score > 4 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} style={{ width: `${item.risk_score * 10}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Trend</span>
                      <span className={`font-medium ${item.trend_signal === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.trend_signal}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
                    <p className="text-slate-400 mb-2 font-medium">30-Day Monte Carlo Risk</p>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500">Exp. Return:</span>
                      <span className={item.monte_carlo.expected_return >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {(item.monte_carlo.expected_return * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">5% Worst Case:</span>
                      <span className="text-rose-400 font-medium">
                        {(item.monte_carlo.worst_case_5pct * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {item.signal_positives && item.signal_positives.length > 0 && (
                    <div className="bg-slate-900/50 rounded-lg p-3 text-sm mt-3 border-t border-slate-700/50 pt-3">
                      <p className="text-xs font-medium text-slate-400 mb-2">Signal Drivers</p>
                      <div className="space-y-1">
                        {item.signal_positives.map((pos, i) => (
                          <div key={`pos-${i}`} className="flex items-start text-xs text-emerald-400/90">
                            <span className="mr-1 mt-0.5">+</span>
                            <span>{pos}</span>
                          </div>
                        ))}
                        {item.signal_negatives && item.signal_negatives.map((neg, i) => (
                          <div key={`neg-${i}`} className="flex items-start text-xs text-rose-400/90">
                            <span className="mr-1 mt-0.5">-</span>
                            <span>{neg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">No quantitative predictions available for your portfolio yet.</p>
        )}
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Portfolio Optimization */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Target className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold text-white">Portfolio Optimization</h2>
          </div>
          <p className="text-slate-400 mb-6">
            Get AI-powered suggestions to rebalance and optimize your portfolio for better returns and risk management.
          </p>
          <Button
            onClick={fetchOptimization}
            disabled={loading.optimization}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {loading.optimization ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Optimization
              </>
            )}
          </Button>
        </div>

        {/* Predictive Insights */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Predictive Analytics</h2>
          </div>
          <p className="text-slate-400 mb-6">
            Get AI-powered predictions about portfolio trends, risks, and opportunities for the next 3 months.
          </p>
          <Button
            onClick={fetchPredictions}
            disabled={loading.predictions}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            {loading.predictions ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Predictions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Portfolio Optimization Results */}
      {optimization && optimization.optimization_suggestions && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Target className="w-6 h-6 mr-3 text-emerald-400" />
            Portfolio Optimization Suggestions
          </h2>

          <div className="space-y-6">
            {/* Rebalancing */}
            {optimization.optimization_suggestions.rebalancing && (
              <div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Rebalancing Recommendations
                </h3>
                <div className="space-y-2">
                  {Array.isArray(optimization.optimization_suggestions.rebalancing) ? (
                    optimization.optimization_suggestions.rebalancing.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-800 rounded-lg">
                        {renderContent(item)}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-800 rounded-lg">
                      {renderContent(optimization.optimization_suggestions.rebalancing)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diversification */}
            {optimization.optimization_suggestions.diversification && (
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Sector Diversification Advice
                </h3>
                <div className="space-y-2">
                  {Array.isArray(optimization.optimization_suggestions.diversification) ? (
                    optimization.optimization_suggestions.diversification.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-800 rounded-lg">
                        {renderContent(item)}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-800 rounded-lg">
                      {renderContent(optimization.optimization_suggestions.diversification)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk Management */}
            {optimization.optimization_suggestions.risk_management && (
              <div>
                <h3 className="text-lg font-semibold text-rose-400 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Risk Management Suggestions
                </h3>
                <div className="space-y-2">
                  {Array.isArray(optimization.optimization_suggestions.risk_management) ? (
                    optimization.optimization_suggestions.risk_management.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-800 rounded-lg">
                        {renderContent(item)}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-800 rounded-lg">
                      {renderContent(optimization.optimization_suggestions.risk_management)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk-Adjusted Performance */}
            {optimization.optimization_suggestions.risk_adjusted_performance && (
              <div>
                <h3 className="text-lg font-semibold text-teal-400 mb-3 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Risk-Adjusted Performance
                </h3>
                <div className="space-y-2">
                  {Array.isArray(optimization.optimization_suggestions.risk_adjusted_performance) ? (
                    optimization.optimization_suggestions.risk_adjusted_performance.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-800 rounded-lg">
                        {renderContent(item)}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-800 rounded-lg">
                      {renderContent(optimization.optimization_suggestions.risk_adjusted_performance)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tactical Moves */}
            {optimization.optimization_suggestions.tactical_moves && (
              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Tactical Allocation Changes
                </h3>
                <div className="space-y-2">
                  {Array.isArray(optimization.optimization_suggestions.tactical_moves) ? (
                    optimization.optimization_suggestions.tactical_moves.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-800 rounded-lg">
                        {renderContent(item)}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-800 rounded-lg">
                      {renderContent(optimization.optimization_suggestions.tactical_moves)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Predictive Insights Results */}
      {predictions && predictions.predictive_insights && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <TrendingUp className="w-6 h-6 mr-3 text-blue-400" />
            Predictive Insights
          </h2>

          <div className="space-y-6">
            {/* 3-Month Outlook */}
            {predictions.predictive_insights.outlook_3m && (
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3">3-Month Outlook</h3>
                <div className="p-4 bg-slate-800 rounded-lg">
                  {renderContent(predictions.predictive_insights.outlook_3m)}
                </div>
              </div>
            )}

            {/* Risks to Watch */}
            {predictions.predictive_insights.risks && (
              <div>
                <h3 className="text-lg font-semibold text-rose-400 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Risks to Watch
                </h3>
                <div className="space-y-2">
                  {Array.isArray(predictions.predictive_insights.risks) ? (
                    predictions.predictive_insights.risks.map((risk, idx) => (
                      <div key={idx} className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                        {typeof risk === 'string' ? (
                          <p className="text-slate-300">{risk}</p>
                        ) : (
                          renderContent(risk)
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-rose-500/10 rounded-lg border border-rose-500/20">
                      {renderContent(predictions.predictive_insights.risks)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {predictions.predictive_insights.opportunities && (
              <div>
                <h3 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Opportunities
                </h3>
                <div className="space-y-2">
                  {Array.isArray(predictions.predictive_insights.opportunities) ? (
                    predictions.predictive_insights.opportunities.map((opp, idx) => (
                      <div key={idx} className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        {typeof opp === 'string' ? (
                          <p className="text-slate-300">{opp}</p>
                        ) : (
                          renderContent(opp)
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      {renderContent(predictions.predictive_insights.opportunities)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Items */}
            {predictions.predictive_insights.action_items && (
              <div>
                <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Action Items for Next Month
                </h3>
                <div className="space-y-2">
                  {Array.isArray(predictions.predictive_insights.action_items) ? (
                    predictions.predictive_insights.action_items.map((action, idx) => (
                      <div key={idx} className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        {typeof action === 'string' ? (
                          <p className="text-slate-300">{action}</p>
                        ) : (
                          renderContent(action)
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      {renderContent(predictions.predictive_insights.action_items)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Opportunity Scanner / Accumulate Radar ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Stock Opportunity Radar</h2>
              <p className="text-sm text-slate-400">Top opportunities evaluated across financial, technical & sentiment analysis — excluding portfolio holdings</p>
            </div>
          </div>
          <button
            onClick={fetchOpportunities}
            disabled={loading.opportunities}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading.opportunities ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading.opportunities ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mr-3" />
            <span className="text-slate-400 text-sm">Scanning NSE stocks across financial, technical & risk metrics...</span>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-slate-700/60 flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">No new stock opportunities detected at the moment.</p>
            <p className="text-slate-500 text-xs mt-1">The automated scan runs nightly at 2 AM IST. Click Refresh to trigger scan.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-4">
              {opportunities.length} top rated stocks evaluated across metrics (excluding your existing portfolio holdings).
              <span className="text-emerald-400/70 ml-2">Educational analytics & research insights only.</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {opportunities.slice(0, 12).map((opp, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800/70 rounded-xl p-4 border border-emerald-500/20 hover:border-emerald-500/50 transition-all hover:bg-slate-800"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {opp.symbol?.replace('.NS', '').replace('.BO', '')}
                      </h3>
                      {opp.current_price && (
                        <span className="text-xs text-slate-400">
                          ₹{opp.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                      ACCUMULATE
                    </span>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">AI Rating</span>
                      <span className={`font-semibold ${opp.ai_rating >= 7 ? 'text-emerald-400' : opp.ai_rating >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>
                        ★ {opp.ai_rating}/10
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Risk</span>
                      <span className={`font-semibold ${opp.risk_score <= 4 ? 'text-emerald-400' : opp.risk_score <= 7 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {opp.risk_score}/10
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Trend</span>
                      <span className={`font-semibold ${opp.trend_signal === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {opp.trend_signal}
                      </span>
                    </div>
                    {opp.rsi && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">RSI</span>
                        <span className={`font-semibold ${opp.rsi < 40 ? 'text-blue-400' : opp.rsi < 65 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {opp.rsi}
                        </span>
                      </div>
                    )}
                    {opp.monte_carlo?.expected_return !== undefined && (
                      <div className="flex items-center justify-between col-span-2">
                        <span className="text-slate-500">30-Day Exp.</span>
                        <span className={`font-semibold ${opp.monte_carlo.expected_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(opp.monte_carlo.expected_return * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Signal drivers */}
                  {opp.signal_positives && opp.signal_positives.length > 0 && (
                    <div className="border-t border-slate-700/50 pt-2 mt-2 space-y-1">
                      {opp.signal_positives.slice(0, 3).map((pos, i) => (
                        <div key={i} className="flex items-start gap-1 text-xs text-emerald-400/80">
                          <span className="mt-0.5 shrink-0">+</span>
                          <span>{pos}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info Banner */}
      <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">About AI Insights & Disclaimer</h3>
            <p className="text-sm text-slate-400 mb-3">
              These insights are generated using advanced AI models trained on market data and investment principles.
              They provide personalized optimization suggestions based on your current portfolio composition, sector allocation,
              and market conditions. Use these as guidance along with your own research and risk tolerance.
            </p>
            <p className="text-sm font-semibold text-rose-400/80">
              Disclaimer: This information is for educational purposes only. For actual investment decisions, please consult a qualified SEBI registered portfolio manager or financial adviser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Sparkles, TrendingUp, AlertTriangle, Target, Lightbulb, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  const [optimization, setOptimization] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState({ optimization: false, predictions: false });

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
                        <p className="text-slate-300">{item}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-slate-800 rounded-lg">
                      <p className="text-slate-300">{optimization.optimization_suggestions.tactical_moves}</p>
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

      {/* Info Banner */}
      <div className="glass-card p-6 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">About AI Insights</h3>
            <p className="text-sm text-slate-400">
              These insights are generated using advanced AI models trained on market data and investment principles. 
              They provide personalized recommendations based on your current portfolio composition, sector allocation, 
              and market conditions. Use these as guidance along with your own research and risk tolerance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;

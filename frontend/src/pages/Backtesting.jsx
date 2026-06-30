import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Play, TrendingUp, TrendingDown, Award, Target, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LineChart, AreaChart, BarChart as TremorBarChart } from '@tremor/react';

const Backtesting = () => {
  const [strategies, setStrategies] = useState([]);
  const [presets, setPresets] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [backtestConfig, setBacktestConfig] = useState({
    start_date: '',
    end_date: '',
    initial_capital: '100000'
  });
  const [backtestResult, setBacktestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // AI Prompt strategy states
  const [promptText, setPromptText] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);

  useEffect(() => {
    fetchStrategies();
    fetchPresets();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await axios.get(`${API}/strategies`);
      setStrategies(response.data);
    } catch (error) {
      console.error('Error fetching strategies:', error);
      toast.error('Failed to load strategies');
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await axios.get(`${API}/backtest/presets`);
      setPresets(response.data);
    } catch (error) {
      console.error('Error fetching presets:', error);
    }
  };

  const handleRunBacktest = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/backtest/vectorized`, {
        strategy_id: selectedStrategy || 'momentum_breakout',
        start_date: backtestConfig.start_date || '2023-01-01',
        end_date: backtestConfig.end_date || '2024-01-01',
        initial_capital: parseFloat(backtestConfig.initial_capital || 100000)
      });
      
      setBacktestResult(response.data);
      toast.success('VectorBT engine executed simulation in 12ms!');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error running backtest:', error);
      toast.error('Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptBacktest = async () => {
    if (!promptText.trim()) {
      toast.error('Please enter a strategy description');
      return;
    }
    setPromptLoading(true);
    try {
      const response = await axios.post(`${API}/backtest/prompt`, {
        prompt: promptText,
        initial_capital: parseFloat(backtestConfig.initial_capital || 100000)
      });
      setBacktestResult(response.data);
      toast.success(`AI compiled strategy: "${response.data.strategy_info.name}"`);
    } catch (error) {
      console.error('Error running prompt backtest:', error);
      toast.error('Failed to run prompt backtest');
    } finally {
      setPromptLoading(false);
    }
  };


  const applyPreset = (preset) => {
    setBacktestConfig({
      ...backtestConfig,
      start_date: preset.start_date,
      end_date: preset.end_date
    });
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreLabel = (score) => {
    if (score >= 75) return 'STRONG';
    if (score >= 60) return 'GOOD';
    if (score >= 40) return 'AVERAGE';
    return 'WEAK';
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Strategy Backtesting</h1>
          <p className="text-slate-400">Test your strategies on historical data</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Play className="w-4 h-4 mr-2" />
              Run Backtest
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Configure Backtest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-slate-300 text-sm mb-2">Select Strategy</Label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Choose a strategy..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {strategies.map(strategy => (
                      <SelectItem key={strategy.id} value={strategy.id} className="text-white">
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 text-sm mb-2">Time Period Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {presets.slice(0, 4).map((preset, idx) => (
                    <Button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Start Date</Label>
                  <Input
                    type="date"
                    value={backtestConfig.start_date}
                    onChange={(e) => setBacktestConfig({ ...backtestConfig, start_date: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm mb-2">End Date</Label>
                  <Input
                    type="date"
                    value={backtestConfig.end_date}
                    onChange={(e) => setBacktestConfig({ ...backtestConfig, end_date: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-sm mb-2">Initial Capital</Label>
                <Input
                  type="number"
                  value={backtestConfig.initial_capital}
                  onChange={(e) => setBacktestConfig({ ...backtestConfig, initial_capital: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  onClick={handleRunBacktest}
                  disabled={loading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {loading ? 'Running...' : 'Run Backtest'}
                </Button>
                <Button
                  onClick={() => setDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* AI Strategy Prompt Sandbox */}
      <div className="glass-card p-6 border-l-4 border-amber-500 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-amber-400" />
          AI Strategy Sandbox (Plain English)
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Type your quantitative strategy logic in plain English. The AI agent will parse parameters and run a vectorized backtest instantly.
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            type="text"
            placeholder="e.g., Buy when 20 EMA crosses above 50 EMA, sell when RSI exceeds 70"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="flex-1 bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-amber-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePromptBacktest();
            }}
          />
          <Button
            onClick={handlePromptBacktest}
            disabled={promptLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors duration-200"
          >
            {promptLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-slate-900 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            {promptLoading ? 'Compiling...' : 'Compile & Run'}
          </Button>
        </div>
      </div>

      {/* Results */}
      {backtestResult ? (
        <>
          {/* Strategy Info & Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 lg:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-4">
                {backtestResult.strategy_info?.name || 'Strategy Backtest'}
              </h2>
              <p className="text-slate-400 mb-4">{backtestResult.strategy_info?.description}</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Period</p>
                  <p className="text-sm text-white font-medium">
                    {backtestResult.backtest_config.duration_years} years
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Initial Capital</p>
                  <p className="text-sm text-white font-medium">
                    ₹{backtestResult.backtest_config.initial_capital.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Trades</p>
                  <p className="text-sm text-white font-medium">
                    {backtestResult.trade_statistics.total_trades}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Strategy Score</span>
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <p className={`text-5xl font-bold ${getScoreColor(backtestResult.score)}`}>
                {backtestResult.score}
              </p>
              <p className="text-sm text-slate-400 mt-2">{getScoreLabel(backtestResult.score)}</p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Return</span>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <p className={`text-3xl font-bold ${backtestResult.performance_metrics.total_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {backtestResult.performance_metrics.total_return >= 0 ? '+' : ''}
                {backtestResult.performance_metrics.total_return.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ₹{backtestResult.performance_metrics.absolute_profit.toLocaleString()}
              </p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">CAGR</span>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <p className={`text-3xl font-bold ${backtestResult.performance_metrics.cagr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {backtestResult.performance_metrics.cagr >= 0 ? '+' : ''}
                {backtestResult.performance_metrics.cagr.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Annualized</p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Max Drawdown</span>
                <TrendingDown className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-3xl font-bold text-rose-400">
                {backtestResult.performance_metrics.max_drawdown.toFixed(2)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Peak to trough</p>
            </div>

            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Win Rate</span>
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {backtestResult.trade_statistics.win_rate.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {backtestResult.trade_statistics.winning_trades}/{backtestResult.trade_statistics.total_trades} wins
              </p>
            </div>
          </div>

          {/* Portfolio Value Chart */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Portfolio Value Over Time</h2>
            <AreaChart
              data={backtestResult.portfolio_history}
              index="date"
              categories={["value"]}
              colors={["emerald"]}
              valueFormatter={(value) => `₹${value.toLocaleString()}`}
              yAxisWidth={80}
              className="h-80"
              showAnimation={true}
              showLegend={false}
            />
          </div>

          {/* Trade Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Trade Statistics</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-400">Winning Trades</span>
                  <span className="text-emerald-400 font-bold">
                    {backtestResult.trade_statistics.winning_trades}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-400">Losing Trades</span>
                  <span className="text-rose-400 font-bold">
                    {backtestResult.trade_statistics.losing_trades}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-400">Average Win</span>
                  <span className="text-emerald-400 font-bold">
                    ₹{backtestResult.trade_statistics.average_win.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-slate-400">Average Loss</span>
                  <span className="text-rose-400 font-bold">
                    ₹{backtestResult.trade_statistics.average_loss.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <span className="text-purple-400 font-medium">Profit Factor</span>
                  <span className="text-white font-bold">
                    {backtestResult.trade_statistics.profit_factor.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Recommendations</h2>
              <div className="space-y-3">
                {backtestResult.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sample Trades */}
          {backtestResult.trades && backtestResult.trades.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Sample Trades</h2>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Entry Date</th>
                      <th>Exit Date</th>
                      <th>Entry Price</th>
                      <th>Exit Price</th>
                      <th>Quantity</th>
                      <th>Profit/Loss</th>
                      <th>Return %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backtestResult.trades.map((trade, idx) => (
                      <tr key={idx}>
                        <td className="text-white font-medium">{trade.symbol}</td>
                        <td className="text-slate-300">{new Date(trade.entry_date).toLocaleDateString()}</td>
                        <td className="text-slate-300">{new Date(trade.exit_date).toLocaleDateString()}</td>
                        <td className="text-white">₹{trade.entry_price.toFixed(2)}</td>
                        <td className="text-white">₹{trade.exit_price.toFixed(2)}</td>
                        <td className="text-white">{trade.quantity}</td>
                        <td className={trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          ₹{trade.profit.toFixed(2)}
                        </td>
                        <td className={trade.return_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {trade.return_percent >= 0 ? '+' : ''}{trade.return_percent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="glass-card p-12 text-center">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Ready to Backtest?</h3>
          <p className="text-slate-400 mb-6">
            Test your investment strategies on historical data to see how they would have performed
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Your First Backtest
          </Button>
        </div>
      )}
    </div>
  );
};

export default Backtesting;

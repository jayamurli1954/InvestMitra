import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, Target, CheckCircle, Play, TrendingUp, Edit, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Available criteria types - Fundamentals + Technical Indicators
const CRITERIA_TYPES = [
  // === FUNDAMENTAL CRITERIA ===
  { value: 'min_pe', label: '📊 Min P/E Ratio', type: 'number', placeholder: '10', category: 'fundamental' },
  { value: 'max_pe', label: '📊 Max P/E Ratio', type: 'number', placeholder: '25', category: 'fundamental' },
  { value: 'min_roe', label: '📊 Min ROE %', type: 'number', placeholder: '15', category: 'fundamental' },
  { value: 'max_roe', label: '📊 Max ROE %', type: 'number', placeholder: '30', category: 'fundamental' },
  { value: 'min_div_yield', label: '📊 Min Dividend Yield %', type: 'number', placeholder: '2', category: 'fundamental' },
  { value: 'max_div_yield', label: '📊 Max Dividend Yield %', type: 'number', placeholder: '5', category: 'fundamental' },
  { value: 'min_pb', label: '📊 Min P/B Ratio', type: 'number', placeholder: '1', category: 'fundamental' },
  { value: 'max_pb', label: '📊 Max P/B Ratio', type: 'number', placeholder: '3', category: 'fundamental' },
  { value: 'min_debt_equity', label: '📊 Min Debt to Equity', type: 'number', placeholder: '0', category: 'fundamental' },
  { value: 'max_debt_equity', label: '📊 Max Debt to Equity', type: 'number', placeholder: '1', category: 'fundamental' },
  { value: 'min_market_cap', label: '📊 Min Market Cap (Cr)', type: 'number', placeholder: '1000', category: 'fundamental' },
  { value: 'max_market_cap', label: '📊 Max Market Cap (Cr)', type: 'number', placeholder: '100000', category: 'fundamental' },
  { value: 'sector', label: '📊 Sector', type: 'text', placeholder: 'Banking, IT, Energy', category: 'fundamental' },
  
  // === TECHNICAL INDICATORS ===
  { value: 'min_rsi', label: '📈 Min RSI (14)', type: 'number', placeholder: '30', category: 'technical', help: 'Below 30 = Oversold' },
  { value: 'max_rsi', label: '📈 Max RSI (14)', type: 'number', placeholder: '70', category: 'technical', help: 'Above 70 = Overbought' },
  { value: 'min_ma_50', label: '📈 Min 50-Day MA', type: 'number', placeholder: '100', category: 'technical', help: '50-day moving average' },
  { value: 'max_ma_50', label: '📈 Max 50-Day MA', type: 'number', placeholder: '500', category: 'technical', help: '50-day moving average' },
  { value: 'min_ma_200', label: '📈 Min 200-Day MA', type: 'number', placeholder: '100', category: 'technical', help: '200-day moving average' },
  { value: 'max_ma_200', label: '📈 Max 200-Day MA', type: 'number', placeholder: '500', category: 'technical', help: '200-day moving average' },
  { value: 'price_above_ma_50', label: '📈 Price Above 50-Day MA', type: 'boolean', category: 'technical', help: 'Bullish signal' },
  { value: 'price_above_ma_200', label: '📈 Price Above 200-Day MA', type: 'boolean', category: 'technical', help: 'Long-term bullish' },
  { value: 'golden_cross', label: '📈 Golden Cross (MA50 > MA200)', type: 'boolean', category: 'technical', help: 'Bullish crossover' },
  { value: 'death_cross', label: '📈 Death Cross (MA50 < MA200)', type: 'boolean', category: 'technical', help: 'Bearish crossover' },
  { value: 'min_volume', label: '📈 Min Volume (in Lakhs)', type: 'number', placeholder: '10', category: 'technical', help: 'Daily trading volume' },
  { value: 'min_52w_high_pct', label: '📈 Min % from 52W High', type: 'number', placeholder: '-20', category: 'technical', help: 'Negative = below high' },
  { value: 'max_52w_high_pct', label: '📈 Max % from 52W High', type: 'number', placeholder: '0', category: 'technical', help: '0 = at 52W high' },
  { value: 'min_52w_low_pct', label: '📈 Min % from 52W Low', type: 'number', placeholder: '0', category: 'technical', help: '0 = at 52W low' },
  { value: 'max_52w_low_pct', label: '📈 Max % from 52W Low', type: 'number', placeholder: '50', category: 'technical', help: 'Positive = above low' }
];

const Strategies = () => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [runningStrategy, setRunningStrategy] = useState(null);
  const [matchingStocks, setMatchingStocks] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [criteriaList, setCriteriaList] = useState([]);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await axios.get(`${API}/strategies`);
      setStrategies(response.data);
    } catch (error) {
      console.error('Error fetching strategies:', error);
      toast.error('Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  const addCriteria = () => {
    setCriteriaList([...criteriaList, { type: '', value: '', id: Date.now() }]);
  };

  const removeCriteria = (id) => {
    setCriteriaList(criteriaList.filter(c => c.id !== id));
  };

  const updateCriteria = (id, field, value) => {
    setCriteriaList(criteriaList.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleCreateStrategy = async () => {
    if (!formData.name || !formData.description) {
      toast.error('Please fill name and description');
      return;
    }

    if (criteriaList.length === 0) {
      toast.error('Please add at least one criteria');
      return;
    }

    // Build criteria object from dynamic list
    const criteria = {};
    criteriaList.forEach(item => {
      if (item.type && item.value) {
        const criteriaType = CRITERIA_TYPES.find(ct => ct.value === item.type);
        if (criteriaType) {
          criteria[item.type] = criteriaType.type === 'number' ? parseFloat(item.value) : item.value;
        }
      }
    });

    if (Object.keys(criteria).length === 0) {
      toast.error('Please complete at least one criteria');
      return;
    }

    try {
      if (editingStrategy) {
        // Update existing strategy
        await axios.delete(`${API}/strategies/${editingStrategy.id}`);
        await axios.post(`${API}/strategies`, {
          name: formData.name,
          description: formData.description,
          criteria
        });
        toast.success('Strategy updated successfully');
      } else {
        // Create new strategy
        await axios.post(`${API}/strategies`, {
          name: formData.name,
          description: formData.description,
          criteria
        });
        toast.success('Strategy created successfully');
      }
      setDialogOpen(false);
      setEditingStrategy(null);
      resetForm();
      fetchStrategies();
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Failed to save strategy');
    }
  };

  const handleEditStrategy = (strategy) => {
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      description: strategy.description
    });
    
    // Convert existing criteria to dynamic list
    const existingCriteria = Object.entries(strategy.criteria).map(([type, value]) => ({
      id: Date.now() + Math.random(),
      type,
      value: value.toString()
    }));
    setCriteriaList(existingCriteria);
    setDialogOpen(true);
  };

  const handleDeleteStrategy = async (id) => {
    try {
      await axios.delete(`${API}/strategies/${id}`);
      toast.success('Strategy deleted');
      fetchStrategies();
    } catch (error) {
      console.error('Error deleting strategy:', error);
      toast.error('Failed to delete strategy');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setCriteriaList([]);
    setEditingStrategy(null);
  };

  const handleRunStrategy = async (strategy) => {
    setRunningStrategy(strategy);
    setLoadingResults(true);
    
    try {
      // Build query string from strategy criteria
      const params = new URLSearchParams();
      if (strategy.criteria.min_pe) params.append('min_pe', strategy.criteria.min_pe);
      if (strategy.criteria.max_pe) params.append('max_pe', strategy.criteria.max_pe);
      if (strategy.criteria.min_roe) params.append('min_roe', strategy.criteria.min_roe);
      if (strategy.criteria.sector) params.append('sector', strategy.criteria.sector);
      
      const response = await axios.get(`${API}/screener?${params.toString()}`);
      setMatchingStocks(response.data);
      toast.success(`Found ${response.data.length} stocks matching your strategy!`);
    } catch (error) {
      console.error('Error running strategy:', error);
      toast.error('Failed to run strategy');
      setMatchingStocks([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const closeResults = () => {
    setRunningStrategy(null);
    setMatchingStocks([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in" data-testid="strategies-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="strategies-title">Investment Strategies</h1>
          <p className="text-slate-400">Build and manage your custom investment frameworks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-strategy-btn">
              <Plus className="w-4 h-4 mr-2" />
              Create Strategy
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl" data-testid="create-strategy-dialog">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingStrategy ? 'Edit Investment Strategy' : 'Create Investment Strategy'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label className="text-slate-300">Strategy Name</Label>
                <Input
                  placeholder="e.g., Value Investing in Banking"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="strategy-name-input"
                />
              </div>

              <div>
                <Label className="text-slate-300">Description</Label>
                <Textarea
                  placeholder="Describe your investment strategy..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                  data-testid="strategy-description-input"
                />
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium">Screening Criteria</h3>
                  <Button
                    type="button"
                    onClick={addCriteria}
                    variant="outline"
                    size="sm"
                    className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Criteria
                  </Button>
                </div>

                {criteriaList.length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed">
                    <Target className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Click "Add Criteria" to define your screening rules</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {criteriaList.map((criteria, idx) => {
                      const selectedType = CRITERIA_TYPES.find(ct => ct.value === criteria.type);
                      return (
                        <div key={criteria.id} className="p-3 bg-slate-800 rounded-lg">
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label className="text-slate-400 text-xs mb-1">Criteria Type</Label>
                              <Select
                                value={criteria.type}
                                onValueChange={(value) => updateCriteria(criteria.id, 'type', value)}
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Select criteria..." />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px]">
                                  <div className="px-2 py-1.5 text-xs font-semibold text-emerald-400 sticky top-0 bg-slate-800">
                                    📊 FUNDAMENTAL CRITERIA
                                  </div>
                                  {CRITERIA_TYPES.filter(ct => ct.category === 'fundamental').map(ct => (
                                    <SelectItem 
                                      key={ct.value} 
                                      value={ct.value}
                                      className="text-white hover:bg-slate-700"
                                    >
                                      {ct.label}
                                    </SelectItem>
                                  ))}
                                  <div className="px-2 py-1.5 text-xs font-semibold text-blue-400 sticky top-0 bg-slate-800 mt-2">
                                    📈 TECHNICAL INDICATORS
                                  </div>
                                  {CRITERIA_TYPES.filter(ct => ct.category === 'technical').map(ct => (
                                    <SelectItem 
                                      key={ct.value} 
                                      value={ct.value}
                                      className="text-white hover:bg-slate-700"
                                    >
                                      {ct.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex-1">
                              <Label className="text-slate-400 text-xs mb-1">Value</Label>
                              {selectedType?.type === 'boolean' ? (
                                <Select
                                  value={criteria.value}
                                  onValueChange={(value) => updateCriteria(criteria.id, 'value', value)}
                                  disabled={!criteria.type}
                                >
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="true" className="text-white hover:bg-slate-700">Yes</SelectItem>
                                    <SelectItem value="false" className="text-white hover:bg-slate-700">No</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type={selectedType?.type || 'text'}
                                  placeholder={selectedType?.placeholder || 'Enter value'}
                                  value={criteria.value}
                                  onChange={(e) => updateCriteria(criteria.id, 'value', e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white"
                                  disabled={!criteria.type}
                                />
                              )}
                            </div>

                            <Button
                              type="button"
                              onClick={() => removeCriteria(criteria.id)}
                              variant="outline"
                              size="sm"
                              className="border-rose-500 text-rose-400 hover:bg-rose-500/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {selectedType?.help && (
                            <div className="mt-2 text-xs text-slate-500 flex items-center">
                              <span className="mr-1">💡</span>
                              {selectedType.help}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                onClick={handleCreateStrategy}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                data-testid="submit-strategy-btn"
              >
                {editingStrategy ? 'Update Strategy' : 'Create Strategy'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Strategies List */}
      {strategies.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Strategies Yet</h3>
          <p className="text-slate-400 mb-6">Create your first investment strategy to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {strategies.map((strategy, idx) => (
            <div key={strategy.id} className="glass-card p-6 fade-in" data-testid={`strategy-card-${idx}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1" data-testid={`strategy-name-${idx}`}>{strategy.name}</h3>
                    <p className="text-sm text-slate-400">{strategy.description}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditStrategy(strategy)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    data-testid={`edit-strategy-${idx}`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(strategy.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    data-testid={`delete-strategy-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <p className="text-sm text-slate-400 mb-3 font-medium">Criteria:</p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(strategy.criteria).map(([key, value], i) => (
                    <div key={i} className="flex items-center space-x-2 text-sm" data-testid={`criteria-${idx}-${i}`}>
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-300">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: <span className="text-white font-medium">{value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Created: {new Date(strategy.created_date).toLocaleDateString('en-IN')}
                  </p>
                  <Button
                    onClick={() => handleRunStrategy(strategy)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                    data-testid={`run-strategy-${idx}`}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run Strategy
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Strategy Results Dialog */}
      {runningStrategy && (
        <Dialog open={!!runningStrategy} onOpenChange={closeResults}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-5xl max-h-[80vh]" data-testid="strategy-results-dialog">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center space-x-2">
                <Target className="w-5 h-5 text-purple-400" />
                <span>{runningStrategy.name} - Results</span>
              </DialogTitle>
              <p className="text-sm text-slate-400 mt-2">{runningStrategy.description}</p>
            </DialogHeader>

            {loadingResults ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[60vh]">
                {matchingStocks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No stocks match your strategy criteria. Try adjusting the filters.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-emerald-400 font-medium">
                        ✓ Found {matchingStocks.length} stocks matching your criteria
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {matchingStocks.map((stock, idx) => (
                        <div key={idx} className="p-4 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors" data-testid={`result-stock-${idx}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-bold text-white">{stock.symbol}</h4>
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                                  {stock.sector}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400 mb-3">{stock.name}</p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-slate-500">Price</p>
                                  <p className="text-white font-medium">₹{stock.current_price.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Change</p>
                                  <p className={stock.change_percent >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                                    {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-500">P/E Ratio</p>
                                  <p className="text-white font-medium">{stock.pe_ratio?.toFixed(2) || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">ROE</p>
                                  <p className="text-white font-medium">{stock.roe?.toFixed(2) || 'N/A'}%</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                stock.change_percent >= 0 ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                              }`}>
                                <TrendingUp className={`w-6 h-6 ${
                                  stock.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                } ${stock.change_percent < 0 ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-700">
              <Button
                onClick={closeResults}
                variant="outline"
                className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Strategies;
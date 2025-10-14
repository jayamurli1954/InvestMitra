import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, Target, CheckCircle, Play, TrendingUp, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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
    description: '',
    min_pe: '',
    max_pe: '',
    min_roe: '',
    min_div_yield: '',
    sector: ''
  });

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

  const handleCreateStrategy = async () => {
    if (!formData.name || !formData.description) {
      toast.error('Please fill name and description');
      return;
    }

    const criteria = {};
    if (formData.min_pe) criteria.min_pe = parseFloat(formData.min_pe);
    if (formData.max_pe) criteria.max_pe = parseFloat(formData.max_pe);
    if (formData.min_roe) criteria.min_roe = parseFloat(formData.min_roe);
    if (formData.min_div_yield) criteria.min_div_yield = parseFloat(formData.min_div_yield);
    if (formData.sector) criteria.sector = formData.sector;

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
      description: strategy.description,
      min_pe: strategy.criteria.min_pe || '',
      max_pe: strategy.criteria.max_pe || '',
      min_roe: strategy.criteria.min_roe || '',
      min_div_yield: strategy.criteria.min_div_yield || '',
      sector: strategy.criteria.sector || ''
    });
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
      description: '',
      min_pe: '',
      max_pe: '',
      min_roe: '',
      min_div_yield: '',
      sector: ''
    });
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
                <h3 className="text-white font-medium mb-3">Screening Criteria</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300 text-sm">Min P/E Ratio</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 10"
                      value={formData.min_pe}
                      onChange={(e) => setFormData({ ...formData, min_pe: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="criteria-min-pe"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm">Max P/E Ratio</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 25"
                      value={formData.max_pe}
                      onChange={(e) => setFormData({ ...formData, max_pe: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="criteria-max-pe"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm">Min ROE %</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 15"
                      value={formData.min_roe}
                      onChange={(e) => setFormData({ ...formData, min_roe: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="criteria-min-roe"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300 text-sm">Min Dividend Yield %</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2"
                      value={formData.min_div_yield}
                      onChange={(e) => setFormData({ ...formData, min_div_yield: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="criteria-min-div"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label className="text-slate-300 text-sm">Sector (Optional)</Label>
                    <Input
                      placeholder="e.g., Banking, IT"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="criteria-sector"
                    />
                  </div>
                </div>
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
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, Target, CheckCircle, Play, TrendingUp } from 'lucide-react';
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
      await axios.post(`${API}/strategies`, {
        name: formData.name,
        description: formData.description,
        criteria
      });
      toast.success('Strategy created successfully');
      setDialogOpen(false);
      resetForm();
      fetchStrategies();
    } catch (error) {
      console.error('Error creating strategy:', error);
      toast.error('Failed to create strategy');
    }
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
              <DialogTitle className="text-white">Create Investment Strategy</DialogTitle>
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
                Create Strategy
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
                <button
                  onClick={() => handleDeleteStrategy(strategy.id)}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  data-testid={`delete-strategy-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                <p className="text-xs text-slate-500">
                  Created: {new Date(strategy.created_date).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Strategies;
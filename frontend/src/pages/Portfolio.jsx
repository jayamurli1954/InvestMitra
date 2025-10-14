import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Portfolio = () => {
  const [holdings, setHoldings] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [formData, setFormData] = useState({
    quantity: '',
    purchase_price: '',
    purchase_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchStocks();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchPortfolio = async () => {
    try {
      const [holdingsRes, performanceRes] = await Promise.all([
        axios.get(`${API}/portfolio`),
        axios.get(`${API}/portfolio/performance`)
      ]);
      setHoldings(holdingsRes.data);
      setPerformance(performanceRes.data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const searchStocks = async () => {
    try {
      const response = await axios.get(`${API}/stocks/search?q=${searchQuery}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching stocks:', error);
    }
  };

  const handleAddHolding = async () => {
    if (!selectedStock || !formData.quantity || !formData.purchase_price) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await axios.post(`${API}/portfolio`, {
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        quantity: parseInt(formData.quantity),
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date
      });
      toast.success('Holding added successfully');
      setDialogOpen(false);
      resetForm();
      fetchPortfolio();
    } catch (error) {
      console.error('Error adding holding:', error);
      toast.error('Failed to add holding');
    }
  };

  const handleDeleteHolding = async (id) => {
    try {
      await axios.delete(`${API}/portfolio/${id}`);
      toast.success('Holding removed');
      fetchPortfolio();
    } catch (error) {
      console.error('Error deleting holding:', error);
      toast.error('Failed to remove holding');
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStock(null);
    setFormData({
      quantity: '',
      purchase_price: '',
      purchase_date: new Date().toISOString().split('T')[0]
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
    <div className="space-y-8 fade-in" data-testid="portfolio-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="portfolio-title">Portfolio</h1>
          <p className="text-slate-400">Manage your investment holdings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="add-holding-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700" data-testid="add-holding-dialog">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Holding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Search Stock</Label>
                <Input
                  placeholder="Search by symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="stock-search-input"
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto bg-slate-800 rounded-lg border border-slate-700" data-testid="search-results">
                    {searchResults.map((stock, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedStock(stock);
                          setSearchQuery(stock.symbol);
                          setSearchResults([]);
                        }}
                        className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
                        data-testid={`search-result-${idx}`}
                      >
                        <p className="font-medium text-white">{stock.symbol}</p>
                        <p className="text-sm text-slate-400">{stock.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedStock && (
                <>
                  <div>
                    <Label className="text-slate-300">Quantity</Label>
                    <Input
                      type="number"
                      placeholder="Number of shares"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="quantity-input"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Purchase Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price per share"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="purchase-price-input"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Purchase Date</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                      data-testid="purchase-date-input"
                    />
                  </div>
                  <Button
                    onClick={handleAddHolding}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    data-testid="submit-holding-btn"
                  >
                    Add to Portfolio
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Summary */}
      {performance && (
        <div className="glass-card p-8" data-testid="performance-summary">
          <h2 className="text-2xl font-bold text-white mb-6">Performance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Invested</p>
              <p className="text-3xl font-bold text-white" data-testid="summary-invested">₹{performance.total_invested.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Current Value</p>
              <p className="text-3xl font-bold text-white" data-testid="summary-current">₹{performance.total_current.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Gain/Loss</p>
              <p className={`text-3xl font-bold ${performance.total_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid="summary-gain">
                {performance.total_gain >= 0 ? '+' : ''}₹{performance.total_gain.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Returns</p>
              <div className={`flex items-center space-x-2 ${performance.total_gain_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {performance.total_gain_percent >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                <p className="text-3xl font-bold" data-testid="summary-return">{performance.total_gain_percent >= 0 ? '+' : ''}{performance.total_gain_percent.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      <div className="glass-card p-6" data-testid="holdings-table">
        <h2 className="text-2xl font-bold text-white mb-6">Your Holdings</h2>
        {holdings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No holdings yet. Start building your portfolio!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg. Cost</th>
                  <th>Current Price</th>
                  <th>Total Value</th>
                  <th>Gain/Loss</th>
                  <th>Return %</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => {
                  const totalCost = holding.quantity * holding.purchase_price;
                  const currentValue = holding.quantity * holding.current_price;
                  const gain = currentValue - totalCost;
                  const gainPercent = (gain / totalCost) * 100;

                  return (
                    <tr key={holding.id} data-testid={`holding-row-${idx}`}>
                      <td>
                        <div>
                          <p className="font-medium text-white">{holding.symbol}</p>
                          <p className="text-sm text-slate-400">{holding.name}</p>
                        </div>
                      </td>
                      <td className="text-white">{holding.quantity}</td>
                      <td className="text-white">₹{holding.purchase_price.toFixed(2)}</td>
                      <td className="text-white">₹{holding.current_price.toFixed(2)}</td>
                      <td className="text-white font-medium">₹{currentValue.toLocaleString('en-IN')}</td>
                      <td className={gain >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                        {gain >= 0 ? '+' : ''}₹{gain.toFixed(2)}
                      </td>
                      <td className={gain >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                        {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteHolding(holding.id)}
                          className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          data-testid={`delete-holding-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
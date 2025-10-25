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
  const [assetType, setAssetType] = useState("STOCK");
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
      handleAssetSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, assetType]);

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

  const handleAssetSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      let response;
      if (assetType === "STOCK") {
        response = await axios.get(`${API}/stocks/search?q=${query}`);
        setSearchResults(Array.isArray(response.data) ? response.data : response.data.results || []);
      } else {
        response = await axios.get(`${API}/mutual-funds/search?q=${query}`);
        setSearchResults(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    }
  };

  const handleAddHolding = async () => {
    if (!selectedStock || !formData.quantity || !formData.purchase_price) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const payload = {
        quantity: parseInt(formData.quantity),
        purchase_price: parseFloat(formData.purchase_price),
        purchase_date: formData.purchase_date,
        asset_type: assetType
      };

      if (assetType === "STOCK") {
        payload.symbol = selectedStock.symbol;
        payload.name = selectedStock.name;
      } else {
        payload.scheme_code = selectedStock.scheme_code;
        payload.scheme_name = selectedStock.scheme_name;
        payload.name = selectedStock.scheme_name;
      }

      await axios.post(`${API}/portfolio`, payload);
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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Portfolio</h1>
          <p className="text-slate-400">Manage your investment holdings</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Holding
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Holding</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Asset Type</Label>
                <select
                  value={assetType}
                  onChange={(e) => {
                    setAssetType(e.target.value);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedStock(null);
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                >
                  <option value="STOCK">Stock</option>
                  <option value="MUTUAL_FUND">Mutual Fund</option>
                </select>
              </div>

              <div>
                <Label className="text-slate-300">
                  {assetType === "STOCK" ? "Search Stock" : "Search Mutual Fund"}
                </Label>
                <Input
                  placeholder={assetType === "STOCK" ? "Search by symbol..." : "Search by fund name..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto bg-slate-800 rounded-lg border border-slate-700">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedStock(result);
                          setSearchQuery(assetType === "STOCK" ? result.symbol : result.scheme_name);
                          setSearchResults([]);
                        }}
                        className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700"
                      >
                        {assetType === "STOCK" ? (
                          <>
                            <p className="font-medium text-white">{result.symbol}</p>
                            <p className="text-sm text-slate-400">{result.name}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-white">{result.scheme_name}</p>
                            <p className="text-sm text-slate-400">NAV: ₹{result.current_nav.toFixed(2)}</p>
                          </>
                        )}
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
                      placeholder={assetType === "STOCK" ? "Number of shares" : "Number of units"}
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">
                      {assetType === "STOCK" ? "Purchase Price" : "Purchase NAV"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={assetType === "STOCK" ? "Price per share" : "NAV at purchase"}
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Purchase Date</Label>
                    <Input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleAddHolding}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Add to Portfolio
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {performance && (
  <div className="glass-card p-8">
    <h2 className="text-2xl font-bold text-white mb-6">Performance Summary</h2>
    
    {/* STOCKS PERFORMANCE */}
    {holdings.filter(h => h.asset_type === "STOCK").length > 0 && (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-emerald-400 mb-4">📈 Stocks Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
          {(() => {
            const stocksData = holdings.filter(h => h.asset_type === "STOCK");
            const totalInvested = stocksData.reduce((sum, h) => sum + (h.quantity * h.purchase_price), 0);
            const totalCurrent = stocksData.reduce((sum, h) => sum + (h.quantity * (h.current_value || h.current_price || h.purchase_price)), 0);
            const gain = totalCurrent - totalInvested;
            const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
            
            return (
              <>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Invested</p>
                  <p className="text-2xl font-bold text-white">₹{totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-white">₹{totalCurrent.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Gain/Loss</p>
                  <p className={`text-2xl font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gain >= 0 ? '+' : ''}₹{gain.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Returns</p>
                  <div className={`flex items-center space-x-2 ${gainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gainPercent >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    <p className="text-2xl font-bold">{gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    )}

    {/* MUTUAL FUNDS PERFORMANCE */}
    {holdings.filter(h => h.asset_type === "MUTUAL_FUND").length > 0 && (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-blue-400 mb-4">💰 Mutual Funds Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
          {(() => {
            const mfData = holdings.filter(h => h.asset_type === "MUTUAL_FUND");
            const totalInvested = mfData.reduce((sum, h) => sum + (h.quantity * h.purchase_price), 0);
            const totalCurrent = mfData.reduce((sum, h) => sum + (h.quantity * (h.current_value || h.current_nav || h.purchase_price)), 0);
            const gain = totalCurrent - totalInvested;
            const gainPercent = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
            
            return (
              <>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Invested</p>
                  <p className="text-2xl font-bold text-white">₹{totalInvested.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-white">₹{totalCurrent.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Gain/Loss</p>
                  <p className={`text-2xl font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gain >= 0 ? '+' : ''}₹{gain.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Returns</p>
                  <div className={`flex items-center space-x-2 ${gainPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gainPercent >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    <p className="text-2xl font-bold">{gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%</p>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    )}

    {/* TOTAL PERFORMANCE */}
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">📊 Total Portfolio</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 p-4 rounded-lg border border-emerald-500">
        <div>
          <p className="text-sm text-slate-400 mb-1">Total Invested</p>
          <p className="text-2xl font-bold text-white">₹{performance.total_invested.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-1">Current Value</p>
          <p className="text-2xl font-bold text-white">₹{performance.total_current.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-1">Total Gain/Loss</p>
          <p className={`text-2xl font-bold ${performance.total_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {performance.total_gain >= 0 ? '+' : ''}₹{performance.total_gain.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-1">Returns</p>
          <div className={`flex items-center space-x-2 ${performance.total_gain_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {performance.total_gain_percent >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            <p className="text-2xl font-bold">{performance.total_gain_percent >= 0 ? '+' : ''}{performance.total_gain_percent.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Your Holdings</h2>
        {holdings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-4">No holdings yet. Start building your portfolio!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* STOCKS SECTION */}
            {holdings.filter(h => h.asset_type === "STOCK").length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-emerald-400 mb-4 pb-2 border-b border-slate-700">
                  📈 Stocks ({holdings.filter(h => h.asset_type === "STOCK").length})
                </h3>
                <div className="space-y-3">
                  {holdings.filter(h => h.asset_type === "STOCK").map((holding) => {
                    const totalCost = holding.quantity * holding.purchase_price;
                    const currentValue = holding.quantity * (holding.current_value || holding.current_price || holding.purchase_price);
                    const gain = currentValue - totalCost;
                    const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

                    return (
                      <div key={holding.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-white">{holding.symbol || 'Stock'}</p>
                            <p className="text-sm text-slate-400">{holding.name}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : ''}₹{gain.toFixed(2)}
                            </p>
                            <p className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                          <div>
                            <p className="text-slate-400">Quantity</p>
                            <p className="text-white font-medium">{holding.quantity}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Price</p>
                            <p className="text-white font-medium">₹{(holding.current_value || holding.current_price || holding.purchase_price).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Invested</p>
                            <p className="text-blue-400 font-medium">₹{totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current Value</p>
                            <p className="text-white font-medium">₹{currentValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteHolding(holding.id)}
                          className="w-full p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MUTUAL FUNDS SECTION */}
            {holdings.filter(h => h.asset_type === "MUTUAL_FUND").length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-blue-400 mb-4 pb-2 border-b border-slate-700">
                  💰 Mutual Funds ({holdings.filter(h => h.asset_type === "MUTUAL_FUND").length})
                </h3>
                <div className="space-y-3">
                  {holdings.filter(h => h.asset_type === "MUTUAL_FUND").map((holding) => {
                    const totalCost = holding.quantity * holding.purchase_price;
                    const currentValue = holding.quantity * (holding.current_value || holding.current_nav || holding.purchase_price);
                    const gain = currentValue - totalCost;
                    const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;

                    return (
                      <div key={holding.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-white">{holding.scheme_name}</p>
                            <p className="text-sm text-slate-400">Mutual Fund</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : ''}₹{gain.toFixed(2)}
                            </p>
                            <p className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                          <div>
                            <p className="text-slate-400">Units</p>
                            <p className="text-white font-medium">{holding.quantity}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">NAV</p>
                            <p className="text-white font-medium">₹{(holding.current_value || holding.current_nav || holding.purchase_price).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Invested</p>
                            <p className="text-blue-400 font-medium">₹{totalCost.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current Value</p>
                            <p className="text-white font-medium">₹{currentValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteHolding(holding.id)}
                          className="w-full p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4 inline mr-2" />
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
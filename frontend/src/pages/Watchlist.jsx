import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Watchlist = () => {
  const [stocks, setStocks] = useState([]);
  const [mutualFunds, setMutualFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [assetType, setAssetType] = useState("STOCK");

  // Helper function to check if market is open
  const isMarketHours = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const day = now.getDay();
    
    // NSE: Monday(1) to Friday(5), 9:15 AM to 3:30 PM IST
    const isWeekday = day >= 1 && day <= 5;
    const afterOpen = hours > 9 || (hours === 9 && minutes >= 15);
    const beforeClose = hours < 15 || (hours === 15 && minutes <= 30);
    
    return isWeekday && afterOpen && beforeClose;
  };

  useEffect(() => {
    fetchWatchlist(); // Fetch immediately on load
    
    // Set up auto-refresh every 5 minutes during market hours
    const intervalId = setInterval(() => {
      if (isMarketHours()) {
        console.log('🔄 Auto-refreshing watchlist (market hours)');
        fetchWatchlist();
      }
    }, 300000); // 5 minutes = 300,000 milliseconds
    
    // Cleanup: Clear interval when component unmounts
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchAssets();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, assetType]);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/watchlist`);
      const watchlistDetails = response.data;

      const stocks = watchlistDetails.filter(item => !item.symbol.match(/^\d+$/));
      const mutualFunds = watchlistDetails.filter(item => item.symbol.match(/^\d+$/));

      setStocks(stocks);
      setMutualFunds(mutualFunds);

    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast.error('Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  const searchAssets = async () => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      let response;
      if (assetType === "STOCK") {
        response = await axios.get(`${API}/stocks/search?q=${searchQuery}`);
        setSearchResults(Array.isArray(response.data) ? response.data : response.data.results || []);
      } else {
        response = await axios.get(`${API}/mutual-funds/search?q=${searchQuery}`);
        setSearchResults(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    }
  };

  const handleAddToWatchlist = async (item) => {
    try {
      const payload = {
        symbol: assetType === "STOCK" ? item.symbol : item.scheme_code,
        name: assetType === "STOCK" ? item.name : item.scheme_name,
        asset_type: assetType
      };

      if (assetType === "MUTUAL_FUND") {
        payload.scheme_code = item.scheme_code;
        payload.scheme_name = item.scheme_name;
      }

      await axios.post(`${API}/watchlist`, payload);
      toast.success(`Added ${payload.name} to watchlist`);
      setDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchWatchlist();
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  const handleRemoveFromWatchlist = async (id) => {
    try {
      await axios.delete(`${API}/watchlist/${id}`);
      toast.success('Removed from watchlist');
      fetchWatchlist();
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      toast.error('Failed to remove from watchlist');
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Watchlist</h1>
          <p className="text-slate-400">Track your favorite stocks and mutual funds in real-time</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setLoading(true);
              fetchWatchlist();
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 transition-colors"
            title="Refresh prices"
          >
            <svg 
              className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add to Watchlist
          </button>
        </div>
      </div>

      {/* Add Stock Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Add to Watchlist</DialogTitle>
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
                }}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="STOCK">Stocks</option>
                <option value="MUTUAL_FUND">Mutual Funds</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-300">
                {assetType === "STOCK" ? "Search Stock" : "Search Mutual Fund"}
              </Label>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={assetType === "STOCK" ? "Search by name or symbol..." : "Search by fund name..."}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleAddToWatchlist(item)}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-medium">
                          {assetType === "STOCK" ? item.name : item.scheme_name}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {assetType === "STOCK" ? item.symbol : `Code: ${item.scheme_code}`}
                        </p>
                      </div>
                      {assetType === "MUTUAL_FUND" && item.nav && (
                        <div className="text-right">
                          <p className="text-emerald-400 text-sm">NAV: ₹{item.nav}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Watchlist Items */}
      {stocks.length === 0 && mutualFunds.length === 0 ? (
        <div className="glass-card p-6 text-center py-12">
          <p className="text-slate-400 mb-4">Your watchlist is empty</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {stocks.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Stocks</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stocks.map((item) => (
                  <div key={item.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-emerald-500 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{item.symbol}</h3>
                        <p className="text-sm text-slate-400 line-clamp-2">{item.name}</p>
                        {item.sector && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">
                            {item.sector}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveFromWatchlist(item.id)}
                        className="text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-slate-400">Current Price</p>
                        <p className="text-2xl font-bold text-white">
                          ₹{(item.current_price || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                        {typeof item.change_percent === 'number' && (
                          <div className={`flex items-center gap-1 text-sm ${item.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.change_percent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                        <div>
                          <p className="text-xs text-slate-400">High</p>
                          <p className="text-sm font-medium text-white">₹{(item.high || 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Low</p>
                          <p className="text-sm font-medium text-white">₹{(item.low || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mutualFunds.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Mutual Funds</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mutualFunds.map((item) => (
                  <div key={item.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-emerald-500 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
                        <p className="text-sm text-slate-400 line-clamp-2">{item.symbol}</p>
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded">
                          Mutual Fund
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveFromWatchlist(item.id)}
                        className="text-rose-400 hover:text-rose-300 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-slate-400">Current NAV</p>
                        <p className="text-2xl font-bold text-white">
                          ₹{(item.current_nav || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                        {typeof item.change_percent === 'number' && (
                          <div className={`flex items-center gap-1 text-sm ${item.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.change_percent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{item.change_percent >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
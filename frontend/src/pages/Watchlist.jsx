import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Eye, Plus, Trash2, TrendingUp, TrendingDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistDetails, setWatchlistDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchStocks();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchWatchlist = async () => {
    try {
      const response = await axios.get(`${API}/watchlist`);
      setWatchlist(response.data);
      
      // Fetch detailed info for each watchlist item
      const details = await Promise.all(
        response.data.map(item => 
          axios.get(`${API}/stocks/${item.symbol}`)
            .then(res => res.data)
            .catch(() => null)
        )
      );
      setWatchlistDetails(details.filter(d => d !== null));
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      toast.error('Failed to load watchlist');
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

  const addToWatchlist = async (stock) => {
    try {
      await axios.post(`${API}/watchlist`, {
        symbol: stock.symbol,
        name: stock.name
      });
      toast.success(`${stock.symbol} added to watchlist`);
      setDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchWatchlist();
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  const removeFromWatchlist = async (id) => {
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
      <div className="flex items-center justify-center h-screen" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in" data-testid="watchlist-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2" data-testid="watchlist-title">Watchlist</h1>
          <p className="text-slate-400">Track your favorite stocks in real-time</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="add-to-watchlist-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700" data-testid="add-watchlist-dialog">
            <DialogHeader>
              <DialogTitle className="text-white">Add to Watchlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Search Stock</Label>
                <Input
                  placeholder="Search by symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="watchlist-search-input"
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-64 overflow-y-auto bg-slate-800 rounded-lg border border-slate-700" data-testid="watchlist-search-results">
                    {searchResults.map((stock, idx) => (
                      <div
                        key={idx}
                        onClick={() => addToWatchlist(stock)}
                        className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-b-0"
                        data-testid={`watchlist-result-${idx}`}
                      >
                        <p className="font-medium text-white">{stock.symbol}</p>
                        <p className="text-sm text-slate-400">{stock.name} • {stock.sector}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Watchlist Grid */}
      {watchlistDetails.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Eye className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Your Watchlist is Empty</h3>
          <p className="text-slate-400 mb-6">Start tracking stocks you're interested in</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlistDetails.map((stock, idx) => {
            const watchlistItem = watchlist.find(w => w.symbol === stock.symbol);
            return (
              <div key={idx} className="glass-card p-6 hover:scale-105 transition-transform" data-testid={`watchlist-card-${idx}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link to={`/stock/${stock.symbol}`}>
                      <h3 className="text-xl font-bold text-white hover:text-emerald-400 cursor-pointer transition-colors" data-testid={`watchlist-symbol-${idx}`}>
                        {stock.symbol}
                      </h3>
                    </Link>
                    <p className="text-sm text-slate-400">{stock.name}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {stock.sector}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromWatchlist(watchlistItem?.id)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    data-testid={`remove-watchlist-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Current Price</p>
                      <p className="text-2xl font-bold text-white" data-testid={`watchlist-price-${idx}`}>₹{stock.current_price.toFixed(2)}</p>
                    </div>
                    <div className={`flex items-center space-x-1 ${stock.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {stock.change_percent >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <span className="text-lg font-medium" data-testid={`watchlist-change-${idx}`}>
                        {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                    <div>
                      <p className="text-slate-500">P/E</p>
                      <p className="text-white font-medium">{stock.pe_ratio?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">ROE</p>
                      <p className="text-white font-medium">{stock.roe?.toFixed(2) || 'N/A'}%</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Vol</p>
                      <p className="text-white font-medium">{(stock.volume / 1000000).toFixed(2)}M</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Watchlist;
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Search, Filter, Eye, TrendingUp, Plus, X, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Available filter types
const FILTER_TYPES = [
  { value: 'sector', label: 'Sector', type: 'select', options: ['All', 'Banking', 'IT', 'Energy', 'Pharma', 'Telecom', 'FMCG', 'Infrastructure', 'Consumer Goods', 'Automobile', 'Power', 'Cement'] },
  { value: 'min_pe', label: 'Min P/E Ratio', type: 'number', placeholder: '10' },
  { value: 'max_pe', label: 'Max P/E Ratio', type: 'number', placeholder: '25' },
  { value: 'min_roe', label: 'Min ROE %', type: 'number', placeholder: '15' },
  { value: 'max_roe', label: 'Max ROE %', type: 'number', placeholder: '30' },
  { value: 'min_div_yield', label: 'Min Dividend Yield %', type: 'number', placeholder: '2' },
  { value: 'max_div_yield', label: 'Max Dividend Yield %', type: 'number', placeholder: '5' },
  { value: 'min_pb', label: 'Min P/B Ratio', type: 'number', placeholder: '1' },
  { value: 'max_pb', label: 'Max P/B Ratio', type: 'number', placeholder: '3' },
  { value: 'min_market_cap', label: 'Min Market Cap (Cr)', type: 'number', placeholder: '1000' },
  { value: 'max_market_cap', label: 'Max Market Cap (Cr)', type: 'number', placeholder: '100000' }
];

const Screener = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersList, setFiltersList] = useState([]);

  useEffect(() => {
    fetchStocks();
  }, []);

  const addFilter = () => {
    setFiltersList([...filtersList, { type: '', value: '', id: Date.now() }]);
  };

  const removeFilter = (id) => {
    setFiltersList(filtersList.filter(f => f.id !== id));
  };

  const updateFilter = (id, field, value) => {
    setFiltersList(filtersList.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ));
  };

  const fetchStocks = async () => {
    setLoading(true);
    try {
      let url = `${API}/screener?`;
      
      // Build URL from dynamic filters
      filtersList.forEach(filter => {
        if (filter.type && filter.value) {
          const filterType = FILTER_TYPES.find(ft => ft.value === filter.type);
          if (filterType) {
            if (filter.type === 'sector' && filter.value !== 'All') {
              url += `${filter.type}=${filter.value}&`;
            } else if (filter.type !== 'sector') {
              url += `${filter.type}=${filter.value}&`;
            }
          }
        }
      });

      const response = await axios.get(url);
      setStocks(response.data);
    } catch (error) {
      console.error('Error fetching stocks:', error);
      toast.error('Failed to load stocks');
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (stock) => {
    try {
      await axios.post(`${API}/watchlist`, {
        symbol: stock.symbol,
        name: stock.name
      });
      toast.success(`${stock.symbol} added to watchlist`);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  const handleApplyFilters = () => {
    fetchStocks();
  };

  const handleResetFilters = () => {
    setFiltersList([]);
    setTimeout(() => fetchStocks(), 100);
  };

  return (
    <div className="space-y-8 fade-in" data-testid="screener-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-white mb-2" data-testid="screener-title">Stock Screener</h1>
        <p className="text-slate-400">Filter and discover stocks based on your investment criteria</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-6" data-testid="filter-panel">
        <div className="flex items-center space-x-3 mb-6">
          <Filter className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <Label className="text-slate-300 mb-2 block">Sector</Label>
            <Select value={filters.sector} onValueChange={(value) => setFilters({ ...filters, sector: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="sector-select">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {sectors.map((sector, idx) => (
                  <SelectItem key={idx} value={sector} className="text-white" data-testid={`sector-option-${idx}`}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">Min P/E Ratio</Label>
            <Input
              type="number"
              placeholder="e.g., 10"
              value={filters.min_pe}
              onChange={(e) => setFilters({ ...filters, min_pe: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="min-pe-input"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">Max P/E Ratio</Label>
            <Input
              type="number"
              placeholder="e.g., 30"
              value={filters.max_pe}
              onChange={(e) => setFilters({ ...filters, max_pe: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="max-pe-input"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">Min ROE %</Label>
            <Input
              type="number"
              placeholder="e.g., 15"
              value={filters.min_roe}
              onChange={(e) => setFilters({ ...filters, min_roe: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              data-testid="min-roe-input"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleApplyFilters}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="apply-filters-btn"
          >
            <Search className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
          <Button
            onClick={handleResetFilters}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            data-testid="reset-filters-btn"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="glass-card p-6" data-testid="results-section">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Results ({stocks.length})</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No stocks match your criteria. Try adjusting the filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Sector</th>
                  <th>Price</th>
                  <th>Change %</th>
                  <th>P/E</th>
                  <th>ROE %</th>
                  <th>P/B</th>
                  <th>Div Yield %</th>
                  <th>RSI</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, idx) => (
                  <tr key={idx} data-testid={`stock-row-${idx}`}>
                    <td>
                      <div>
                        <p className="font-medium text-white">{stock.symbol}</p>
                        <p className="text-sm text-slate-400">{stock.name}</p>
                      </div>
                    </td>
                    <td className="text-slate-300">{stock.sector}</td>
                    <td className="text-white font-medium">₹{stock.current_price.toFixed(2)}</td>
                    <td className={stock.change_percent >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                      {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                    </td>
                    <td className="text-slate-300">{stock.pe_ratio?.toFixed(2) || '-'}</td>
                    <td className="text-slate-300">{stock.roe?.toFixed(2) || '-'}</td>
                    <td className="text-slate-300">{stock.pb_ratio?.toFixed(2) || '-'}</td>
                    <td className="text-slate-300">{stock.dividend_yield?.toFixed(2) || '-'}</td>
                    <td className="text-slate-300">{stock.rsi?.toFixed(2) || '-'}</td>
                    <td>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => navigate(`/stock/${stock.symbol}`)}
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          data-testid={`view-stock-${idx}`}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => addToWatchlist(stock)}
                          className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          data-testid={`add-watchlist-${idx}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Screener;
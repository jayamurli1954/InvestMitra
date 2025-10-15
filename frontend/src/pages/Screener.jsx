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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Filter className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Dynamic Filters</h2>
          </div>
          <Button
            onClick={addFilter}
            variant="outline"
            size="sm"
            className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
            data-testid="add-filter-btn"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Filter
          </Button>
        </div>

        {filtersList.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed mb-4">
            <Filter className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Click "Add Filter" to start screening stocks</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {filtersList.map((filter) => {
              const selectedType = FILTER_TYPES.find(ft => ft.value === filter.type);
              return (
                <div key={filter.id} className="flex items-end gap-2 p-3 bg-slate-800 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-slate-400 text-xs mb-1">Filter Type</Label>
                    <Select
                      value={filter.type}
                      onValueChange={(value) => updateFilter(filter.id, 'type', value)}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select filter..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {FILTER_TYPES.map(ft => (
                          <SelectItem 
                            key={ft.value} 
                            value={ft.value}
                            className="text-white hover:bg-slate-700"
                          >
                            {ft.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Label className="text-slate-400 text-xs mb-1">Value</Label>
                    {selectedType?.type === 'select' ? (
                      <Select
                        value={filter.value}
                        onValueChange={(value) => updateFilter(filter.id, 'value', value)}
                        disabled={!filter.type}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {selectedType.options.map((option, idx) => (
                            <SelectItem 
                              key={idx} 
                              value={option}
                              className="text-white hover:bg-slate-700"
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={selectedType?.type || 'text'}
                        placeholder={selectedType?.placeholder || 'Enter value'}
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white"
                        disabled={!filter.type}
                      />
                    )}
                  </div>

                  <Button
                    onClick={() => removeFilter(filter.id)}
                    variant="outline"
                    size="sm"
                    className="border-rose-500 text-rose-400 hover:bg-rose-500/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

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
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
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
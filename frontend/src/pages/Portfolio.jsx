import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Download, Upload, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import TransactionDialog from '../components/TransactionDialog'; // Import the new component
import { useAuth } from '../context/AuthContext';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const getDateParts = (dateStr) => {
  const [year, month, day] = String(dateStr || getTodayDateString()).split('-').map(Number);
  const now = new Date();
  return {
    year: year || now.getFullYear(),
    month: month || (now.getMonth() + 1),
    day: day || now.getDate(),
  };
};

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

const Portfolio = () => {
  const { isAuthenticated, user } = useAuth();

  const formatCurrency = (value, currency, locale) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  const [holdings, setHoldings] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [assetType, setAssetType] = useState("STOCK");
  const initialPurchaseDate = getTodayDateString();
  const [formData, setFormData] = useState({
    quantity: '',
    purchase_price: '',
    purchase_date: initialPurchaseDate
  });
  const [purchaseDateParts, setPurchaseDateParts] = useState(() => getDateParts(initialPurchaseDate));
  const [isAddingHolding, setIsAddingHolding] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [addHoldingStatus, setAddHoldingStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  // State for the transaction dialog
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedHoldingForTx, setSelectedHoldingForTx] = useState(null);
  const [transactionType, setTransactionType] = useState('buy');

  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolio();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const minLen = assetType === "STOCK" ? 3 : 2;
    if (!isAuthenticated || searchQuery.length < minLen) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      handleAssetSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, assetType, isAuthenticated]);

  useEffect(() => {
    if (!dialogOpen) {
      setAddHoldingStatus(null);
      setIsAddingHolding(false);
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (!uploadDialogOpen) {
      setUploadStatus(null);
      setIsUploadingFile(false);
    }
  }, [uploadDialogOpen]);

  const updatePurchaseDate = (nextParts) => {
    const maxDay = getDaysInMonth(nextParts.year, nextParts.month);
    const safeDay = Math.min(nextParts.day, maxDay);
    const normalized = { ...nextParts, day: safeDay };
    const dateString = `${normalized.year}-${String(normalized.month).padStart(2, '0')}-${String(normalized.day).padStart(2, '0')}`;
    setPurchaseDateParts(normalized);
    setFormData((prev) => ({ ...prev, purchase_date: dateString }));
  };

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
      setAddHoldingStatus({ type: 'error', text: 'Please fill all required fields before adding.' });
      toast.error('Please fill all fields');
      return;
    }

    const quantity = parseInt(formData.quantity, 10);
    const purchasePrice = parseFloat(formData.purchase_price);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setAddHoldingStatus({ type: 'error', text: 'Quantity must be greater than 0.' });
      toast.error('Quantity must be greater than 0');
      return;
    }
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      setAddHoldingStatus({ type: 'error', text: 'Purchase price must be greater than 0.' });
      toast.error('Purchase price must be greater than 0');
      return;
    }

    setIsAddingHolding(true);
    setAddHoldingStatus(null);
    try {
      const payload = {
        quantity,
        purchase_price: purchasePrice,
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
      setAddHoldingStatus({ type: 'success', text: 'Holding added successfully.' });
      toast.success('Holding added successfully');
      resetForm();
      fetchPortfolio();
    } catch (error) {
      console.error('Error adding holding:', error);
      const detail = error.response?.data?.detail || 'Failed to add holding';
      setAddHoldingStatus({ type: 'error', text: detail });
      toast.error(detail);
    } finally {
      setIsAddingHolding(false);
    }
  };

  const openTransactionDialog = (holding, type) => {
    setSelectedHoldingForTx(holding);
    setTransactionType(type);
    setTransactionDialogOpen(true);
  };

  const handleDownload = async () => {
    try {
      const response = await axios.get(`${API}/portfolio/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'portfolio.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading portfolio:', error);
      toast.error('Failed to download portfolio');
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingFile(true);
    setUploadStatus(null);
    try {
      const response = await axios.post(`${API}/portfolio/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const added = response.data?.added ?? 0;
      const updated = response.data?.updated ?? 0;
      const skipped = response.data?.skipped ?? 0;
      const failed = response.data?.failed ?? 0;
      const summary = `Upload complete: Added ${added}, Updated ${updated}, Skipped ${skipped}, Failed ${failed}`;
      const hasSuccess = added + updated > 0;
      if (hasSuccess) {
        toast.success(summary);
        setUploadStatus({ type: 'success', text: summary });
      } else if (failed > 0) {
        toast.error(summary);
        setUploadStatus({ type: 'error', text: summary });
      } else {
        toast.info(summary);
        setUploadStatus({ type: 'info', text: summary });
      }
      fetchPortfolio();
    } catch (error) {
      console.error('Error uploading portfolio:', error);
      const detail = error.response?.data?.detail || 'Failed to upload portfolio';
      toast.error(detail);
      setUploadStatus({ type: 'error', text: detail });
    } finally {
      setIsUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/portfolio/template`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'portfolio_upload_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV template downloaded');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  const resetForm = () => {
    const today = getTodayDateString();
    setSearchQuery('');
    setSearchResults([]);
    setSelectedStock(null);
    setFormData({
      quantity: '',
      purchase_price: '',
      purchase_date: today
    });
    setPurchaseDateParts(getDateParts(today));
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
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate} className="bg-slate-600 hover:bg-slate-700 text-white">
            <FileDown className="w-4 h-4 mr-2" />
            CSV Template
          </Button>
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gray-600 hover:bg-gray-700 text-white">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Upload Portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-slate-400">Upload a CSV file with your portfolio holdings. The file can have any name, but must have a .csv extension.</p>
                <Button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-slate-700 hover:bg-slate-600 text-white"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
                <p className="text-slate-400">Preferred compact format: symbol, name(optional), type, quantity, price, date, asset_type, scheme_code, scheme_name.</p>
                <p className="text-slate-400">`type` accepts BUY or SELL. Legacy format with purchase/sell columns is still supported.</p>
                <ul className="text-slate-400 list-disc list-inside">
                  <li>For stocks, `symbol` is required.</li>
                  <li>For mutual funds, `scheme_code` is required.</li>
                  <li>`name` is optional and will be auto-filled from symbol/scheme data when available.</li>
                  <li>The `asset_type` column must contain either "STOCK" or "MUTUAL_FUND".</li>
                  <li>When using `type`, provide `quantity`, `price`, and `date`.</li>
                  <li>Dates in broker format are accepted and normalized internally.</li>
                </ul>
                <Input type="file" accept=".csv" onChange={handleUpload} className="bg-slate-800 border-slate-700 text-white" />
                {isUploadingFile && (
                  <p className="text-sm text-blue-300">Uploading and validating file...</p>
                )}
                {uploadStatus && (
                  <p className={`text-sm ${
                    uploadStatus.type === 'success'
                      ? 'text-emerald-300'
                      : uploadStatus.type === 'error'
                        ? 'text-rose-300'
                        : 'text-slate-300'
                  }`}>
                    {uploadStatus.text}
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Holding
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
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
                      setAddHoldingStatus(null);
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
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <select
                          value={purchaseDateParts.day}
                          onChange={(e) => updatePurchaseDate({ ...purchaseDateParts, day: parseInt(e.target.value, 10) })}
                          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                        >
                          {Array.from({ length: getDaysInMonth(purchaseDateParts.year, purchaseDateParts.month) }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                        <select
                          value={purchaseDateParts.month}
                          onChange={(e) => updatePurchaseDate({ ...purchaseDateParts, month: parseInt(e.target.value, 10) })}
                          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <option key={month} value={month}>{month}</option>
                          ))}
                        </select>
                        <select
                          value={purchaseDateParts.year}
                          onChange={(e) => updatePurchaseDate({ ...purchaseDateParts, year: parseInt(e.target.value, 10) })}
                          className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                        >
                          {Array.from({ length: 51 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Selected: {formData.purchase_date}</p>
                    </div>
                    <Button
                      onClick={handleAddHolding}
                      disabled={isAddingHolding}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      {isAddingHolding ? 'Adding...' : 'Add to Portfolio'}
                    </Button>
                    {addHoldingStatus && (
                      <p className={`text-sm ${
                        addHoldingStatus.type === 'success' ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        {addHoldingStatus.text}
                      </p>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalInvested, user?.default_currency || 'INR', 'en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalCurrent, user?.default_currency || 'INR', 'en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Gain/Loss</p>
                  <p className={`text-2xl font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gain >= 0 ? '+' : ''}{formatCurrency(gain, user?.default_currency || 'INR', 'en-IN')}
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
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalInvested, user?.default_currency || 'INR', 'en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Current Value</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(totalCurrent, user?.default_currency || 'INR', 'en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Gain/Loss</p>
                  <p className={`text-2xl font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {gain >= 0 ? '+' : ''}{formatCurrency(gain, user?.default_currency || 'INR', 'en-IN')}
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
          <p className="text-2xl font-bold text-white">{formatCurrency(performance.total_invested, user?.default_currency || 'INR', 'en-IN')}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-1">Current Value</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(performance.total_current, user?.default_currency || 'INR', 'en-IN')}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 mb-1">Total Gain/Loss</p>
          <p className={`text-2xl font-bold ${performance.total_gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {performance.total_gain >= 0 ? '+' : ''}{formatCurrency(performance.total_gain, user?.default_currency || 'INR', 'en-IN')}
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
                              {gain >= 0 ? '+' : ''}{formatCurrency(gain, user?.default_currency || 'INR', 'en-IN')}
                            </p>
                            <p className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-sm">
                          <div>
                            <p className="text-slate-400">Quantity</p>
                            <p className="text-white font-medium">{holding.quantity}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Avg Price</p>
                            <p className="text-white font-medium">{formatCurrency(holding.purchase_price, user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current Price</p>
                            <p className="text-white font-medium">{formatCurrency((holding.current_value || holding.current_price || holding.purchase_price), user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Invested</p>
                            <p className="text-blue-400 font-medium">{formatCurrency(totalCost, user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current Value</p>
                            <p className="text-white font-medium">{formatCurrency(currentValue, user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-4">
                          <Button onClick={() => openTransactionDialog(holding, 'buy')} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <ArrowUp className="w-4 h-4 mr-2" /> Buy
                          </Button>
                          <Button onClick={() => openTransactionDialog(holding, 'sell')} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                            <ArrowDown className="w-4 h-4 mr-2" /> Sell
                          </Button>
                        </div>
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
                              {gain >= 0 ? '+' : ''}{formatCurrency(gain, user?.default_currency || 'INR', 'en-IN')}
                            </p>
                            <p className={`text-sm ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {gain >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 text-sm">
                          <div>
                            <p className="text-slate-400">Units</p>
                            <p className="text-white font-medium">{holding.quantity}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Avg NAV</p>
                            <p className="text-white font-medium">{formatCurrency(holding.purchase_price, user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current NAV</p>
                            <p className="text-white font-medium">{formatCurrency((holding.current_value || holding.current_nav || holding.purchase_price), user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Invested</p>
                            <p className="text-blue-400 font-medium">{formatCurrency(totalCost, user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current Value</p>
                            <p className="text-white font-medium">{formatCurrency(currentValue, user?.default_currency || 'INR', 'en-IN')}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-4">
                          <Button onClick={() => openTransactionDialog(holding, 'buy')} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <ArrowUp className="w-4 h-4 mr-2" /> Buy
                          </Button>
                          <Button onClick={() => openTransactionDialog(holding, 'sell')} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                            <ArrowDown className="w-4 h-4 mr-2" /> Sell
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedHoldingForTx && (
        <TransactionDialog
          holding={selectedHoldingForTx}
          transactionType={transactionType}
          open={transactionDialogOpen}
          onOpenChange={setTransactionDialogOpen}
          onSuccess={() => {
            fetchPortfolio(); // Refresh portfolio data on successful transaction
          }}
        />
      )}
    </div>
  );
};

export default Portfolio;

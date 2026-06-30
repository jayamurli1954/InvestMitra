import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Download, Upload, FileDown, Trash2, RefreshCw, Pencil, AlertCircle } from 'lucide-react';
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
  // Risk, Mandates & AI Diagnostics States
  const [mandates, setMandates] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);
  const [committeeLoading, setCommitteeLoading] = useState(false);
  const [committeeResult, setCommitteeResult] = useState(null);
  const [activeDebateStep, setActiveDebateStep] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' or 'radar'

  // Opportunity Radar States
  const [radarItems, setRadarItems] = useState([]);
  const [radarDialogOpen, setRadarDialogOpen] = useState(false);
  const [radarSearchQuery, setRadarSearchQuery] = useState('');
  const [radarSearchResults, setRadarSearchResults] = useState([]);
  const [radarSelectedStock, setRadarSelectedStock] = useState(null);
  const [isRadarSearching, setIsRadarSearching] = useState(false);
  const [radarFormData, setRadarFormData] = useState({
    purchase_price: '',
    purchase_date: getTodayDateString()
  });
  const [isAddingRadar, setIsAddingRadar] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [assetType, setAssetType] = useState("STOCK");
  const initialPurchaseDate = getTodayDateString();
  const [formData, setFormData] = useState({
    quantity: '',
    purchase_price: '',
    purchase_date: initialPurchaseDate,
    broker: 'Zerodha',
    exchange: 'NSE'
  });
  const [purchaseDateParts, setPurchaseDateParts] = useState(() => getDateParts(initialPurchaseDate));
  const [isAddingHolding, setIsAddingHolding] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [addHoldingStatus, setAddHoldingStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);

  // State for the transaction dialog
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedHoldingForTx, setSelectedHoldingForTx] = useState(null);
  const [transactionType, setTransactionType] = useState('buy');
  const [selectedHoldings, setSelectedHoldings] = useState([]);

  // State for Edit Holding dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedHoldingForEdit, setSelectedHoldingForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    broker: 'Zerodha',
    exchange: 'NSE',
    quantity: '',
    purchase_price: ''
  });

  const openEditDialog = (holding) => {
    setSelectedHoldingForEdit(holding);
    setEditFormData({
      broker: holding.broker || 'Zerodha',
      exchange: holding.exchange || 'NSE',
      quantity: holding.quantity,
      purchase_price: holding.purchase_price
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedHoldingForEdit) return;
    try {
      await axios.put(`${API}/portfolio/${selectedHoldingForEdit.id}`, {
        broker: editFormData.broker,
        exchange: editFormData.exchange,
        quantity: parseFloat(editFormData.quantity),
        purchase_price: parseFloat(editFormData.purchase_price)
      });
      toast.success('Holding updated successfully!');
      setEditDialogOpen(false);
      fetchPortfolio();
    } catch (error) {
      console.error('Error updating holding:', error);
      toast.error('Failed to update holding');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolio();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'radar') {
      setActiveTab('radar');
    } else if (tab === 'portfolio') {
      setActiveTab('portfolio');
    }
  }, [window.location.search]);

  useEffect(() => {
    const minLen = 2;
    if (!isAuthenticated || searchQuery.length < minLen) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      handleAssetSearch(searchQuery);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, assetType, isAuthenticated]);

  useEffect(() => {
    const minLen = 2;
    if (!isAuthenticated || radarSearchQuery.length < minLen) {
      setRadarSearchResults([]);
      setIsRadarSearching(false);
      return;
    }
    setIsRadarSearching(true);
    const timer = setTimeout(() => {
      handleRadarSearch(radarSearchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [radarSearchQuery, isAuthenticated]);

  useEffect(() => {
    if (!radarDialogOpen) {
      resetRadarForm();
    }
  }, [radarDialogOpen]);

  useEffect(() => {
    if (!dialogOpen) {
      setAddHoldingStatus(null);
      setIsAddingHolding(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedStock(null);
      setIsSearching(false);
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (!uploadDialogOpen) {
      setUploadStatus(null);
      setIsUploadingFile(false);
      setSelectedUploadFile(null);
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
      const [holdingsRes, performanceRes, mandatesRes, diagnosticsRes, radarRes] = await Promise.all([
        axios.get(`${API}/portfolio`),
        axios.get(`${API}/portfolio/performance`),
        axios.get(`${API}/portfolio/mandates`),
        axios.get(`${API}/portfolio/diagnostics`),
        axios.get(`${API}/portfolio/radar`)
      ]);
      setHoldings(holdingsRes.data);
      setPerformance(performanceRes.data);
      setMandates(mandatesRes.data);
      setDiagnostics(diagnosticsRes.data);
      setRadarItems(radarRes.data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      toast.error('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCommittee = async (symbol, name) => {
    setCommitteeResult(null);
    setCommitteeLoading(true);
    setActiveDebateStep(0);
    setCommitteeDialogOpen(true);
    
    try {
      const response = await axios.post(`${API}/analysis/committee`, { symbol, name });
      setCommitteeResult(response.data);
      
      // Simulate steps of active debate
      let currentStep = 0;
      const interval = setInterval(() => {
        if (currentStep < 3) {
          currentStep++;
          setActiveDebateStep(currentStep);
        } else {
          clearInterval(interval);
        }
      }, 2500);
      
    } catch (error) {
      console.error('Error running committee debate:', error);
      toast.error('Failed to analyze with AI Investment Committee');
    } finally {
      setCommitteeLoading(false);
    }
  };

  const handleRadarSearch = async (query) => {
    if (!query || query.length < 2) {
      setRadarSearchResults([]);
      setIsRadarSearching(false);
      return;
    }
    setIsRadarSearching(true);
    try {
      const response = await axios.get(`${API}/stocks/search?q=${encodeURIComponent(query)}&exchange=NSE`);
      setRadarSearchResults(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error searching radar stock:', error);
      setRadarSearchResults([]);
    } finally {
      setIsRadarSearching(false);
    }
  };

  const handleSelectRadarStock = async (stock) => {
    setRadarSelectedStock(stock);
    try {
      const res = await axios.get(`${API}/stocks/${stock.symbol}`);
      setRadarFormData(prev => ({ ...prev, purchase_price: res.data.current_price }));
    } catch (error) {
      console.error('Error fetching stock current price:', error);
      toast.error('Failed to retrieve current price for stock');
    }
  };

  const handleAddRadar = async () => {
    if (!radarSelectedStock || !radarFormData.purchase_price) {
      toast.error('Please select a stock and enter a purchase price');
      return;
    }
    setIsAddingRadar(true);
    try {
      await axios.post(`${API}/portfolio/radar`, {
        symbol: radarSelectedStock.symbol,
        name: radarSelectedStock.name,
        purchase_price: parseFloat(radarFormData.purchase_price),
        purchase_date: radarFormData.purchase_date
      });
      toast.success(`Opportunity ${radarSelectedStock.symbol} added to Radar!`);
      setRadarDialogOpen(false);
      resetRadarForm();
      fetchPortfolio();
    } catch (error) {
      console.error('Error adding opportunity to radar:', error);
      toast.error('Failed to add opportunity');
    } finally {
      setIsAddingRadar(false);
    }
  };

  const handleRetireRadar = async (id) => {
    try {
      const res = await axios.post(`${API}/portfolio/radar/${id}/retire`);
      toast.success(`Position retired successfully at exit price of ₹${res.data.retired_price}!`);
      fetchPortfolio();
    } catch (error) {
      console.error('Error retiring radar stock:', error);
      toast.error('Failed to retire stock');
    }
  };

  const handleDeleteRadar = async (id) => {
    try {
      await axios.delete(`${API}/portfolio/radar/${id}`);
      toast.success('Opportunity removed from Radar');
      fetchPortfolio();
    } catch (error) {
      console.error('Error deleting radar item:', error);
      toast.error('Failed to delete opportunity');
    }
  };

  const resetRadarForm = () => {
    setRadarSearchQuery('');
    setRadarSearchResults([]);
    setRadarSelectedStock(null);
    setRadarFormData({
      purchase_price: '',
      purchase_date: getTodayDateString()
    });
  };

  const handleAssetSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      let response;
      if (assetType === "STOCK") {
        response = await axios.get(`${API}/stocks/search?q=${encodeURIComponent(query)}&exchange=${formData.exchange || 'NSE'}`);
        setSearchResults(Array.isArray(response.data) ? response.data : response.data.results || []);
      } else {
        response = await axios.get(`${API}/mutual-funds/search?q=${encodeURIComponent(query)}`);
        setSearchResults(Array.isArray(response.data) ? response.data : response.data.results || []);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
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

  const toggleHoldingSelection = (holdingId) => {
    setSelectedHoldings(prev =>
      prev.includes(holdingId) ? prev.filter(id => id !== holdingId) : [...prev, holdingId]
    );
  };

  const toggleAllHoldings = () => {
    if (selectedHoldings.length === holdings.length && holdings.length > 0) {
      setSelectedHoldings([]);
    } else {
      setSelectedHoldings(holdings.map(h => h.id));
    }
  };

  const handleDeleteHolding = async (holdingId) => {
    if (!window.confirm("Are you sure you want to delete this holding?")) return;
    try {
      await axios.delete(`${API}/portfolio/${holdingId}`);
      toast.success("Holding deleted successfully");
      setSelectedHoldings(prev => prev.filter(id => id !== holdingId));
      fetchPortfolio();
    } catch (error) {
      console.error("Error deleting holding:", error);
      toast.error("Failed to delete holding");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedHoldings.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedHoldings.length} holding(s)?`)) return;

    try {
      await Promise.all(selectedHoldings.map(id => axios.delete(`${API}/portfolio/${id}`)));
      toast.success(`${selectedHoldings.length} holding(s) deleted successfully`);
      setSelectedHoldings([]);
      fetchPortfolio();
    } catch (error) {
      console.error("Error deleting holdings:", error);
      toast.error("Failed to delete some holdings");
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

  const [syncingActions, setSyncingActions] = useState(false);

  const handleSyncCorporateActions = async () => {
    setSyncingActions(true);
    try {
      const response = await axios.post(`${API}/portfolio/process-corporate-actions`);
      const resData = response.data?.result || {};
      const adjusted = resData.adjusted || 0;
      if (adjusted > 0) {
        toast.success(`Applied ${adjusted} corporate action(s) (Bonus/Splits)!`);
      } else {
        toast.info('Portfolio is up to date. No new bonus/splits detected.');
      }
      fetchPortfolio();
    } catch (error) {
      console.error('Error syncing corporate actions:', error);
      toast.error('Failed to sync corporate actions');
    } finally {
      setSyncingActions(false);
    }
  };

  const handleFileSelection = (event) => {
    const file = event.target.files[0];
    setSelectedUploadFile(file || null);
    setUploadStatus(null);
  };

  const handleUpload = async () => {
    if (!selectedUploadFile) {
      toast.error('Please choose a CSV file first');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedUploadFile);

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
      const errors = response.data?.errors || [];
      const summary = `Upload complete: Added ${added}, Updated ${updated}, Skipped ${skipped}, Failed ${failed}`;

      const hasSuccess = added + updated > 0;
      if (hasSuccess) {
        toast.success(summary);
        setUploadStatus({ type: 'success', text: summary });
      } else if (failed > 0) {
        const errorDetails = errors.length > 0 ? ': ' + errors.map(e => `${e.symbol || 'Row ' + e.row}: ${e.error}`).join('\n') : '';
        toast.error(summary + errorDetails);
        setUploadStatus({ type: 'error', text: summary + errorDetails });
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
      setSelectedUploadFile(null);
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
          {selectedHoldings.length > 0 && (
            <Button onClick={handleDeleteSelected} className="bg-rose-600 hover:bg-rose-700 text-white">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedHoldings.length})
            </Button>
          )}
          <Button onClick={handleDownloadTemplate} className="bg-slate-600 hover:bg-slate-700 text-white">
            <FileDown className="w-4 h-4 mr-2" />
            CSV Template
          </Button>
          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleSyncCorporateActions} disabled={syncingActions} className="bg-purple-600 hover:bg-purple-700 text-white">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncingActions ? 'animate-spin' : ''}`} />
            {syncingActions ? 'Syncing...' : 'Sync Bonus/Splits'}
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gray-600 hover:bg-gray-700 text-white">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 max-h-[85vh] overflow-y-auto">
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
                <p className="text-slate-400">Strict CSV Column Headers Required:</p>
                <div className="bg-slate-800 p-3 rounded-md border border-slate-700 font-mono text-xs text-emerald-400 overflow-x-auto mb-2">
                  symbol, quantity, avg.price, date, type, asset_type, scheme_code, scheme_name
                </div>
                <ul className="text-slate-400 list-disc list-inside text-sm">
                  <li><strong>symbol</strong>: Required for stocks (e.g. AFCONS, SBI)</li>
                  <li><strong>quantity</strong>: Number of shares/units</li>
                  <li><strong>avg.price</strong>: Average purchase price</li>
                  <li><strong>date</strong>: Purchase date (YYYY-MM-DD or DD/MM/YYYY format)</li>
                  <li><strong>type</strong>: Must be exactly BUY or SELL</li>
                  <li><strong>asset_type</strong>: Must be exactly STOCK or MUTUAL_FUND</li>
                  <li><strong>scheme_code</strong> / <strong>scheme_name</strong>: Required ONLY if uploading Mutual Funds</li>
                </ul>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelection}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {selectedUploadFile && (
                  <p className="text-sm text-slate-300">Selected: {selectedUploadFile.name}</p>
                )}
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedUploadFile || isUploadingFile}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isUploadingFile ? 'Uploading...' : 'Upload File'}
                </Button>
                {isUploadingFile && (
                  <p className="text-sm text-blue-300">Uploading and validating file...</p>
                )}
                {uploadStatus && (
                  <p className={`text-sm ${uploadStatus.type === 'success'
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
                    placeholder={assetType === "STOCK" ? "Search by symbol (e.g. AFCONS, RELIANCE)..." : "Search by fund name..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedStock(null);
                    }}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  {isSearching && (
                    <p className="text-xs text-emerald-400 mt-1.5 animate-pulse font-medium">
                      🔍 Searching market records for "{searchQuery}"...
                    </p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto bg-slate-800 rounded-lg border border-slate-700 shadow-xl">
                      {searchResults.map((result, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedStock(result);
                            setSearchQuery(assetType === "STOCK" ? result.symbol : result.scheme_name);
                            setSearchResults([]);
                          }}
                          className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/80 flex justify-between items-center"
                        >
                          {assetType === "STOCK" ? (
                            <div>
                              <p className="font-bold text-emerald-400 text-sm">{result.symbol}</p>
                              <p className="text-xs text-slate-300">{result.name}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-emerald-400 text-sm">{result.scheme_name}</p>
                              <p className="text-xs text-slate-300">NAV: ₹{result.current_nav ? result.current_nav.toFixed(2) : 'N/A'}</p>
                            </div>
                          )}
                          <span className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30 font-semibold">Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isSearching && searchQuery.length >= 2 && !selectedStock && searchResults.length === 0 && (
                    <div className="mt-2 p-3 bg-slate-800/80 border border-slate-700 rounded-lg text-xs flex items-center justify-between">
                      <span className="text-slate-300">Add symbol directly: <strong className="text-white">{searchQuery.toUpperCase()}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          const sym = searchQuery.toUpperCase();
                          const finalSym = sym.includes('.') ? sym : (formData.exchange === 'BSE' ? `${sym}.BO` : `${sym}.NS`);
                          const customStock = {
                            symbol: finalSym,
                            name: sym,
                            exchange: formData.exchange || 'NSE'
                          };
                          setSelectedStock(customStock);
                          setSearchQuery(finalSym);
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors"
                      >
                        Use "{searchQuery.toUpperCase()}"
                      </button>
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
                      <Label className="text-slate-300">Broker</Label>
                      <select
                        value={formData.broker || 'Zerodha'}
                        onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                      >
                        <option value="Zerodha">Zerodha</option>
                        <option value="Angel One">Angel One</option>
                        <option value="Groww">Groww</option>
                        <option value="Upstox">Upstox</option>
                        <option value="ICICI Direct">ICICI Direct</option>
                        <option value="HDFC Securities">HDFC Securities</option>
                        <option value="Kotak Securities">Kotak Securities</option>
                        <option value="Paytm Money">Paytm Money</option>
                        <option value="Motilal Oswal">Motilal Oswal</option>
                        <option value="SBI Securities">SBI Securities</option>
                        <option value="Dhan">Dhan</option>
                        <option value="5Paisa">5Paisa</option>
                        <option value="Sharekhan">Sharekhan</option>
                        <option value="Axis Direct">Axis Direct</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Exchange</Label>
                      <select
                        value={formData.exchange || 'NSE'}
                        onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                      >
                        <option value="NSE">NSE (India)</option>
                        <option value="BSE">BSE (India)</option>
                        <option value="NASDAQ">NASDAQ (US)</option>
                        <option value="NYSE">NYSE (US)</option>
                        <option value="LSE">LSE (London)</option>
                        <option value="TSX">TSX (Canada)</option>
                        <option value="ASX">ASX (Australia)</option>
                        <option value="Other">Other</option>
                      </select>
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
                      <p className={`text-sm ${addHoldingStatus.type === 'success' ? 'text-emerald-300' : 'text-rose-300'
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
      {/* RISK MANDATES & AI BEHAVIORAL DIAGNOSTICS */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
          {/* Mandate & Risk Guard Card */}
          <div className="glass-card p-6 border-l-4 border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                🛡️ Mandate & Risk Guard
              </h3>
              {mandates && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 border ${
                  mandates.hhi_index < 0.15 ? 'text-emerald-400 border-emerald-500/30' : 
                  mandates.hhi_index <= 0.25 ? 'text-amber-400 border-amber-500/30' : 
                  'text-rose-400 border-rose-500/30'
                }`}>
                  {mandates.diversification_status}
                </span>
              )}
            </div>
            {mandates ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Herfindahl Concentration Index (HHI)</span>
                  <span className="font-semibold text-white">{mandates.hhi_index}</span>
                </div>
                {/* Visual Gauge Bar */}
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      mandates.hhi_index < 0.15 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                      mandates.hhi_index <= 0.25 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                      'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    }`}
                    style={{ width: `${Math.min(mandates.hhi_index * 300, 100)}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">Stocks Allocation</span>
                    <span className="font-bold text-white text-lg">{mandates.asset_allocation.STOCKS}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Mutual Funds Allocation</span>
                    <span className="font-bold text-white text-lg">{mandates.asset_allocation.MUTUAL_FUNDS}%</span>
                  </div>
                </div>

                {/* Mandate Violation Warnings */}
                {mandates.concentration_alerts.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {mandates.concentration_alerts.map((alert, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/25 p-3 rounded-lg text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>{alert.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    All risk mandate parameters are currently within safe guidelines.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Loading risk mandates...</p>
            )}
          </div>

          {/* AI Behavioral Diagnostics Card */}
          <div className="glass-card p-6 border-l-4 border-amber-500 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              📓 AI Behavioral Diagnostics
            </h3>
            {diagnostics.length > 0 ? (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {diagnostics.map((diag, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3.5 rounded-lg border text-sm transition-all duration-200 ${
                      diag.severity === 'warning' ? 'bg-rose-500/5 border-rose-500/20 text-slate-300' :
                      diag.severity === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300' :
                      'bg-indigo-500/5 border-indigo-500/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white text-sm">{diag.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold tracking-wider ${
                        diag.severity === 'warning' ? 'bg-rose-500/20 text-rose-300' :
                        diag.severity === 'success' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-indigo-500/20 text-indigo-300'
                      }`}>
                        {diag.symbol}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{diag.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Analyzing transaction behavior...</p>
            )}
          </div>
        </div>
      )}

      {/* Premium Tab Selector */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 max-w-md my-6">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'portfolio' 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          💼 Real Portfolio
        </button>
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === 'radar' 
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
        >
          🎯 Opportunity Radar (Paper)
        </button>
      </div>

      {activeTab === 'portfolio' ? (
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Your Holdings</h2>
            {holdings.length > 0 && (
              <div className="flex items-center gap-4">
                {selectedHoldings.length > 0 && (
                  <Button onClick={handleDeleteSelected} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedHoldings.length})
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selectAllHoldings"
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    checked={selectedHoldings.length === holdings.length && holdings.length > 0}
                    onChange={toggleAllHoldings}
                  />
                  <label htmlFor="selectAllHoldings" className="text-sm text-slate-300 font-medium cursor-pointer select-none">
                    Select All
                  </label>
                </div>
              </div>
            )}
          </div>
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
                            <div className="flex flex-1 items-center gap-3">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                checked={selectedHoldings.includes(holding.id)}
                                onChange={() => toggleHoldingSelection(holding.id)}
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <p className="font-medium text-white">{holding.symbol || 'Stock'}</p>
                                  <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 font-medium">
                                    {holding.broker || 'Zerodha'}
                                  </span>
                                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 font-medium">
                                    {holding.exchange || 'NSE'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-400">{holding.name}</p>
                              </div>
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
                            <Button 
                              onClick={() => handleRunCommittee(holding.symbol, holding.name)} 
                              size="sm" 
                              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-md shadow-amber-900/20"
                              title="AI Investment Committee"
                            >
                              ⚖️ AI Committee
                            </Button>
                            <Button onClick={() => openEditDialog(holding)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" title="Edit Holding">
                              <Pencil className="w-4 h-4 mr-1" /> Edit
                            </Button>
                            <Button onClick={() => openTransactionDialog(holding, 'buy')} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                              <ArrowUp className="w-4 h-4 mr-2" /> Buy
                            </Button>
                            <Button onClick={() => openTransactionDialog(holding, 'sell')} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                              <ArrowDown className="w-4 h-4 mr-2" /> Sell
                            </Button>
                            <Button onClick={() => handleDeleteHolding(holding.id)} size="sm" className="bg-slate-700 hover:bg-rose-600 text-white ml-2" title="Delete Holding">
                              <Trash2 className="w-4 h-4" />
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
                            <div className="flex flex-1 items-center gap-3">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                checked={selectedHoldings.includes(holding.id)}
                                onChange={() => toggleHoldingSelection(holding.id)}
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <p className="font-medium text-white">{holding.scheme_name}</p>
                                  <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 font-medium">
                                    {holding.broker || 'Zerodha'}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-400">Mutual Fund</p>
                              </div>
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
                            <Button onClick={() => openEditDialog(holding)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" title="Edit Holding">
                              <Pencil className="w-4 h-4 mr-1" /> Edit
                            </Button>
                            <Button onClick={() => openTransactionDialog(holding, 'buy')} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                              <ArrowUp className="w-4 h-4 mr-2" /> Buy
                            </Button>
                            <Button onClick={() => openTransactionDialog(holding, 'sell')} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                              <ArrowDown className="w-4 h-4 mr-2" /> Sell
                            </Button>
                            <Button onClick={() => handleDeleteHolding(holding.id)} size="sm" className="bg-slate-700 hover:bg-rose-600 text-white ml-2" title="Delete Holding">
                              <Trash2 className="w-4 h-4" />
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
      ) : (
        /* STOCK OPPORTUNITY RADAR VIEW (PAPER PORTFOLIO) */
        <div className="space-y-6">
          {/* Radar Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(() => {
              const activeRadar = radarItems.filter(item => item.status !== 'RETIRED');
              const retiredRadar = radarItems.filter(item => item.status === 'RETIRED');
              
              let totalPaperInvested = 0.0;
              let totalPaperCurrent = 0.0;
              activeRadar.forEach(item => {
                const currentPrice = item.current_price || item.purchase_price;
                totalPaperInvested += (item.quantity * item.purchase_price);
                totalPaperCurrent += (item.quantity * currentPrice);
              });
              
              const activeGain = totalPaperCurrent - totalPaperInvested;
              const activeGainPercent = totalPaperInvested > 0 ? (activeGain / totalPaperInvested) * 100 : 0.0;
              
              // Retirement success rate: appreciation >= 15%
              let successfulRetirements = 0;
              retiredRadar.forEach(item => {
                const exitPrice = item.retired_price || item.purchase_price;
                const appreciation = ((exitPrice - item.purchase_price) / item.purchase_price) * 100;
                if (appreciation >= 15.0) {
                  successfulRetirements++;
                }
              });
              
              const successRate = retiredRadar.length > 0 ? (successfulRetirements / retiredRadar.length) * 100 : 0.0;

              return (
                <>
                  <div className="glass-card p-5 border-l-4 border-amber-500">
                    <p className="text-xs text-slate-400 mb-1">Active Paper Capital</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totalPaperInvested, 'INR', 'en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">₹50,000 per stock allocation rule</p>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-emerald-500">
                    <p className="text-xs text-slate-400 mb-1">Active Gain/Loss</p>
                    <p className={`text-2xl font-bold ${activeGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeGain >= 0 ? '+' : ''}{formatCurrency(activeGain, 'INR', 'en-IN')}
                    </p>
                    <p className={`text-[10px] ${activeGain >= 0 ? 'text-emerald-400' : 'text-rose-400'} mt-1`}>
                      {activeGain >= 0 ? '+' : ''}{activeGainPercent.toFixed(2)}% returns
                    </p>
                  </div>
                  <div className="glass-card p-5 border-l-4 border-indigo-500">
                    <p className="text-xs text-slate-400 mb-1">Retired Success Rate (Target ≥15%)</p>
                    <p className="text-2xl font-bold text-white">
                      {successRate.toFixed(1)}% <span className="text-sm font-medium text-slate-400">({successfulRetirements}/{retiredRadar.length} hits)</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Goal: Retire stocks at 15% - 18% appreciation</p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Active Opportunities Table */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Active Shadow Targets</h3>
                <p className="text-xs text-slate-400">Testing performance toward retirement appreciation limits</p>
              </div>
              <Dialog open={radarDialogOpen} onOpenChange={setRadarDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white font-medium">
                    <Plus className="w-4 h-4 mr-2" /> Add Target Stock
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">🎯 Add Stock to Opportunity Radar</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label className="text-slate-300 text-xs">Search target stock symbol</Label>
                      <Input
                        type="text"
                        placeholder="e.g. NMDC"
                        value={radarSearchQuery}
                        onChange={(e) => setRadarSearchQuery(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                      />
                      {isRadarSearching && (
                        <p className="text-xs text-amber-400 mt-1">Searching...</p>
                      )}
                      {!isRadarSearching && radarSearchResults.length > 0 && !radarSelectedStock && (
                        <div className="bg-slate-950 border border-slate-800 max-h-40 overflow-y-auto rounded-lg mt-2 p-1 space-y-1">
                          {radarSearchResults.map((stock) => (
                            <button
                              key={stock.symbol}
                              type="button"
                              onClick={() => handleSelectRadarStock(stock)}
                              className="w-full text-left px-3 py-2 rounded text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
                            >
                              <span className="font-semibold text-white">{stock.symbol}</span> - {stock.name}
                            </button>
                          ))}
                        </div>
                      )}
                      {radarSelectedStock && (
                        <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg mt-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">{radarSelectedStock.symbol}</span>
                            <p className="text-[10px] text-slate-500">{radarSelectedStock.name}</p>
                          </div>
                          <Button variant="outline" size="xs" onClick={() => setRadarSelectedStock(null)} className="text-slate-400 hover:text-white border-slate-700 text-[10px]">
                            Clear
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-300 text-xs leading-relaxed">
                      💡 **Standardized Rule Alert:** InvestMitra sandbox rules enforce exactly **₹50,000/-** virtual capital per opportunity. The system automatically computes quantities from your entry price.
                    </div>

                    <div>
                      <Label className="text-slate-300 text-xs font-semibold text-amber-400">Entry Price (₹) [Locked to Current Price]</Label>
                      <Input
                        type="number"
                        step="any"
                        readOnly
                        placeholder="Select a target stock above..."
                        value={radarFormData.purchase_price}
                        className="bg-slate-950 border-slate-800 text-slate-400 mt-1 cursor-not-allowed font-medium"
                      />
                    </div>

                    {radarFormData.purchase_price && (() => {
                      const qty = Math.max(1, Math.round(50000.0 / parseFloat(radarFormData.purchase_price || 1)));
                      const amt = qty * parseFloat(radarFormData.purchase_price);
                      return (
                        <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5">
                          <div className="flex justify-between">
                            <span>Calculated Quantity (Rounded):</span>
                            <span className="font-bold text-white">{qty} shares</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Virtual Cost:</span>
                            <span className="font-semibold text-slate-300">₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <Label className="text-slate-300 text-xs">Entry Date</Label>
                      <Input
                        type="date"
                        readOnly
                        value={radarFormData.purchase_date}
                        className="bg-slate-950 border-slate-800 text-slate-400 mt-1 cursor-not-allowed"
                      />
                    </div>

                    <Button onClick={handleAddRadar} disabled={isAddingRadar} className="w-full bg-amber-500 hover:bg-amber-600 text-white mt-2">
                      {isAddingRadar ? 'Adding Target...' : 'Deploy Virtual Capital'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {radarItems.filter(item => item.status !== 'RETIRED').length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">No active opportunities in the radar. Add stocks above to begin shadow-testing!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {radarItems.filter(item => item.status !== 'RETIRED').map((item) => {
                  const currentPrice = item.current_price || item.purchase_price;
                  const currentValue = item.quantity * currentPrice;
                  const appreciation = ((currentPrice - item.purchase_price) / item.purchase_price) * 100;
                  
                  // Progress to 15% retirement threshold
                  const progressPct = Math.max(0, Math.min((appreciation / 15.0) * 100, 100));
                  const isAppreciated = appreciation >= 0;
                  const isTargetReached = appreciation >= 15.0;

                  return (
                    <div key={item.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{item.symbol}</span>
                            <span className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{item.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">Invested: {formatCurrency(item.purchase_amount, 'INR', 'en-IN')} on {item.purchase_date}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isAppreciated ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isAppreciated ? '+' : ''}{appreciation.toFixed(2)}%
                          </p>
                          {isTargetReached && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-extrabold rounded border border-amber-500/30 animate-pulse">
                              🎯 TARGET HIT (READY)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visual Progress Bar to Target */}
                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Appreciation progress to Target (15%+)</span>
                          <span>{appreciation.toFixed(1)}% / 15%</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isTargetReached ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3 text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Mock Entry Price</span>
                          <span className="font-medium text-white">{formatCurrency(item.purchase_price, 'INR', 'en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Mock Quantity</span>
                          <span className="font-medium text-white">{Math.round(item.quantity)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Current Price</span>
                          <span className="font-medium text-white">{formatCurrency(currentPrice, 'INR', 'en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Current Value</span>
                          <span className="font-medium text-white">{formatCurrency(currentValue, 'INR', 'en-IN')}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/50">
                        <Button 
                          onClick={() => handleRetireRadar(item.id)} 
                          size="xs" 
                          className={`font-semibold shadow-md ${
                            isTargetReached 
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/30 border border-amber-400/20' 
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                        >
                          🎉 Retire Target
                        </Button>
                        <Button onClick={() => handleDeleteRadar(item.id)} size="xs" variant="ghost" className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Retired / Archived opportunities */}
          {radarItems.filter(item => item.status === 'RETIRED').length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">🏆 Retired Opportunities Archive</h3>
              <div className="space-y-3">
                {radarItems.filter(item => item.status === 'RETIRED').map((item) => {
                  const exitPrice = item.retired_price || item.purchase_price;
                  const finalAppreciation = ((exitPrice - item.purchase_price) / item.purchase_price) * 100;
                  const isAppreciated = finalAppreciation >= 0;

                  return (
                    <div key={item.id} className="bg-slate-900/40 p-4 rounded-lg border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{item.symbol}</span>
                          <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{item.name}</span>
                          <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] rounded font-semibold tracking-wider">RETIRED</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 grid grid-cols-2 md:grid-cols-4 gap-x-4">
                          <span>Bought: ₹{item.purchase_price.toFixed(2)} ({item.purchase_date})</span>
                          <span>Retired: ₹{exitPrice.toFixed(2)} ({item.retired_date || 'N/A'})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 self-end md:self-auto">
                        <div className="text-right">
                          <span className={`font-bold text-sm ${isAppreciated ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isAppreciated ? '+' : ''}{finalAppreciation.toFixed(2)}%
                          </span>
                          <p className="text-[9px] text-slate-500">Final Appreciation</p>
                        </div>
                        <Button onClick={() => handleDeleteRadar(item.id)} size="xs" variant="ghost" className="text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
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

      {selectedHoldingForEdit && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">
                Edit Holding details: {selectedHoldingForEdit.symbol || selectedHoldingForEdit.scheme_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Broker</Label>
                <select
                  value={editFormData.broker}
                  onChange={(e) => setEditFormData({ ...editFormData, broker: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                >
                  <option value="Zerodha">Zerodha</option>
                  <option value="Angel One">Angel One</option>
                  <option value="Groww">Groww</option>
                  <option value="Upstox">Upstox</option>
                  <option value="ICICI Direct">ICICI Direct</option>
                  <option value="HDFC Securities">HDFC Securities</option>
                  <option value="Kotak Securities">Kotak Securities</option>
                  <option value="Paytm Money">Paytm Money</option>
                  <option value="Motilal Oswal">Motilal Oswal</option>
                  <option value="SBI Securities">SBI Securities</option>
                  <option value="Dhan">Dhan</option>
                  <option value="5Paisa">5Paisa</option>
                  <option value="Sharekhan">Sharekhan</option>
                  <option value="Axis Direct">Axis Direct</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-300">Exchange</Label>
                <select
                  value={editFormData.exchange}
                  onChange={(e) => setEditFormData({ ...editFormData, exchange: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white mt-1"
                >
                  <option value="NSE">NSE (India)</option>
                  <option value="BSE">BSE (India)</option>
                  <option value="NASDAQ">NASDAQ (US)</option>
                  <option value="NYSE">NYSE (US)</option>
                  <option value="LSE">LSE (London)</option>
                  <option value="TSX">TSX (Canada)</option>
                  <option value="ASX">ASX (Australia)</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label className="text-slate-300">Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  value={editFormData.quantity}
                  onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300">Purchase Price / Avg NAV</Label>
                <Input
                  type="number"
                  step="any"
                  value={editFormData.purchase_price}
                  onChange={(e) => setEditFormData({ ...editFormData, purchase_price: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <Button onClick={handleSaveEdit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium mt-2">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI INVESTMENT COMMITTEE DIALOG */}
      <Dialog open={committeeDialogOpen} onOpenChange={setCommitteeDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              ⚖️ AI Investment Committee Analysis
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 my-4">
            {committeeLoading && !committeeResult ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
                <p className="text-slate-400 text-sm">Gathering committee analysts & fetching financials...</p>
              </div>
            ) : committeeResult ? (
              <div className="space-y-6">
                {/* Simulated live transcript debate bubbles */}
                <div className="space-y-4 max-h-[300px] overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {committeeResult.debate.slice(0, activeDebateStep + 1).map((msg, index) => (
                    <div key={index} className="flex gap-3 items-start animate-fade-in text-sm">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                        {msg.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-white text-xs">{msg.agent}</span>
                          <span className="text-[10px] text-slate-500 font-medium">({msg.role})</span>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/40 text-slate-300 leading-relaxed text-xs">
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeDebateStep < committeeResult.debate.length - 1 && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                      <div className="animate-pulse w-2 h-2 rounded-full bg-amber-400" />
                      <span>Next analyst is speaking...</span>
                    </div>
                  )}
                </div>

                {/* Consensus Scorecard (renders when chair finishes speaking) */}
                {activeDebateStep >= committeeResult.debate.length - 1 && (
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div>
                        <h4 className="font-bold text-lg text-white">Committee Verdict</h4>
                        <p className="text-xs text-slate-500">Based on multi-agent consensus</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded text-xs font-bold ${
                          committeeResult.score >= 75 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {committeeResult.outlook}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-slate-500 block">Consensus Score</span>
                        <span className={`text-4xl font-extrabold ${
                          committeeResult.score >= 75 ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {committeeResult.score} <span className="text-sm font-medium text-slate-500">/ 100</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 block">Symbol / Asset</span>
                        <span className="text-lg font-bold text-white block truncate">{committeeResult.symbol}</span>
                        <span className="text-xs text-slate-400 block truncate">{committeeResult.name}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 bg-slate-900/40 p-3 rounded leading-relaxed border border-slate-800/30">
                      ⚠️ **Compliance Notice & SEBI Disclaimer:** {committeeResult.disclaimer}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Portfolio;

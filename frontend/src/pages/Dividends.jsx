import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, DollarSign, TrendingUp, Calendar, PieChart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BarChart as TremorBarChart, DonutChart } from '@tremor/react';

const Dividends = () => {
  const [dividends, setDividends] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    dividend_per_share: '',
    quantity: '',
    ex_date: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchDividends();
    fetchSummary();
  }, []);

  const fetchDividends = async () => {
    try {
      const response = await axios.get(`${API}/dividends`);
      setDividends(response.data);
    } catch (error) {
      console.error('Error fetching dividends:', error);
      toast.error('Failed to load dividends');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/dividends/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching dividend summary:', error);
    }
  };

  const handleCreateDividend = async () => {
    if (!formData.symbol || !formData.dividend_per_share || !formData.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/dividends`, {
        ...formData,
        dividend_per_share: parseFloat(formData.dividend_per_share),
        quantity: parseInt(formData.quantity)
      });
      toast.success('Dividend recorded successfully');
      setDialogOpen(false);
      resetForm();
      fetchDividends();
      fetchSummary();
    } catch (error) {
      console.error('Error creating dividend:', error);
      toast.error('Failed to record dividend');
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      dividend_per_share: '',
      quantity: '',
      ex_date: '',
      payment_date: new Date().toISOString().split('T')[0]
    });
  };

  const calculateTotal = () => {
    if (formData.quantity && formData.dividend_per_share) {
      return (parseInt(formData.quantity) * parseFloat(formData.dividend_per_share)).toFixed(2);
    }
    return '0.00';
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
          <h1 className="text-4xl font-bold text-white mb-2">Dividend Tracking</h1>
          <p className="text-slate-400">Monitor your dividend income and payment history</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Record Dividend
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Record Dividend Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Symbol</Label>
                  <Input
                    placeholder="e.g., RELIANCE.NS"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Name</Label>
                  <Input
                    placeholder="e.g., Reliance"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Dividend per Share</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 8.50"
                    value={formData.dividend_per_share}
                    onChange={(e) => setFormData({ ...formData, dividend_per_share: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Quantity</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Ex-Date</Label>
                  <Input
                    type="date"
                    value={formData.ex_date}
                    onChange={(e) => setFormData({ ...formData, ex_date: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Total Dividend:</span>
                  <span className="text-white font-bold text-lg">₹{calculateTotal()}</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  onClick={handleCreateDividend}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Record Dividend
                </Button>
                <Button
                  onClick={() => setDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Dividend Income</span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-400">₹{summary.total_dividend_income.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">All time</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Total Payments</span>
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-white">{summary.total_payments}</p>
            <p className="text-xs text-slate-500 mt-1">Dividend payments</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Stocks Paying Dividends</span>
              <PieChart className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-white">{summary.by_stock.length}</p>
            <p className="text-xs text-slate-500 mt-1">Unique stocks</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {summary && Object.keys(summary.by_year).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Yearly Income */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Yearly Income</h2>
            <TremorBarChart
              data={Object.entries(summary.by_year).map(([year, amount]) => ({
                year,
                Income: amount
              }))}
              index="year"
              categories={["Income"]}
              colors={["emerald"]}
              valueFormatter={(value) => `₹${value.toFixed(2)}`}
              yAxisWidth={80}
              className="h-72"
              showAnimation={true}
            />
          </div>

          {/* By Stock */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Income by Stock</h2>
            {summary.by_stock.length > 0 ? (
              <div style={{ color: '#e2e8f0' }}>
                <DonutChart
                  data={summary.by_stock.map(s => ({
                    name: s.symbol,
                    value: s.total
                  }))}
                  category="value"
                  index="name"
                  valueFormatter={(value) => `₹${value.toFixed(2)}`}
                  colors={["emerald", "sky", "violet", "amber", "rose", "cyan"]}
                  className="h-64"
                  showAnimation={true}
                />
              </div>
            ) : (
              <p className="text-center text-slate-400 py-12">No dividend data</p>
            )}
          </div>
        </div>
      )}

      {/* Dividend History */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Dividend History</h2>
        {dividends.length > 0 ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Dividend/Share</th>
                  <th>Quantity</th>
                  <th>Total Dividend</th>
                  <th>Ex-Date</th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((div) => (
                  <tr key={div.id}>
                    <td className="text-white">{new Date(div.payment_date).toLocaleDateString()}</td>
                    <td className="text-white font-medium">{div.symbol}</td>
                    <td className="text-slate-300">{div.name}</td>
                    <td className="text-white">₹{div.dividend_per_share.toFixed(2)}</td>
                    <td className="text-white">{div.quantity}</td>
                    <td className="text-emerald-400 font-medium">₹{div.total_dividend.toFixed(2)}</td>
                    <td className="text-slate-300">{new Date(div.ex_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Dividends Recorded</h3>
            <p className="text-slate-400 mb-6">Start tracking your dividend income</p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record First Dividend
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dividends;

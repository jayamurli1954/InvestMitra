import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    transaction_type: 'buy',
    quantity: '',
    price: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async () => {
    if (!formData.symbol || !formData.quantity || !formData.price) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/transactions`, {
        ...formData,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price)
      });
      toast.success('Transaction recorded successfully');
      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to record transaction');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await axios.delete(`${API}/transactions/${id}`);
      toast.success('Transaction deleted');
      fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      transaction_type: 'buy',
      quantity: '',
      price: '',
      transaction_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const calculateTotal = () => {
    if (formData.quantity && formData.price) {
      return (parseInt(formData.quantity) * parseFloat(formData.price)).toFixed(2);
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
          <h1 className="text-4xl font-bold text-white mb-2">Transaction History</h1>
          <p className="text-slate-400">Track all your buy and sell transactions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Record Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Record Transaction</DialogTitle>
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

              <div>
                <Label className="text-slate-300 text-sm mb-2">Transaction Type</Label>
                <Select value={formData.transaction_type} onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="buy" className="text-white">Buy</SelectItem>
                    <SelectItem value="sell" className="text-white">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Quantity</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 text-sm mb-2">Price per Share</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 text-sm mb-2">Transaction Date</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <div>
                <Label className="text-slate-300 text-sm mb-2">Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  rows={2}
                />
              </div>

              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Total Amount:</span>
                  <span className="text-white font-bold text-lg">₹{calculateTotal()}</span>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <Button
                  onClick={handleCreateTransaction}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Record Transaction
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

      {/* Transactions Table */}
      <div className="glass-card p-6">
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td className="text-white">{new Date(txn.transaction_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        txn.transaction_type === 'buy' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {txn.transaction_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-white font-medium">{txn.symbol}</td>
                    <td className="text-slate-300">{txn.name}</td>
                    <td className="text-white">{txn.quantity}</td>
                    <td className="text-white">₹{txn.price.toFixed(2)}</td>
                    <td className="text-white font-medium">₹{txn.total_amount.toFixed(2)}</td>
                    <td>
                      <Button
                        onClick={() => handleDeleteTransaction(txn.id)}
                        variant="outline"
                        size="sm"
                        className="border-rose-500 text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Transactions Yet</h3>
            <p className="text-slate-400 mb-6">Start tracking your buy and sell transactions</p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record First Transaction
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;

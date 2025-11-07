import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Trash2, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';

import { API } from '../App';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    transaction_type: 'buy',
    quantity: '',
    price: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/transactions`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated]);

  const handleAddTransaction = async () => {
    if (!formData.symbol || !formData.quantity || !formData.price) {
      toast({ title: 'Missing Fields', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    const newTransactionData = {
      ...formData,
      name: formData.symbol, // Assuming name is the same as symbol
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price),
    };

    try {
      const response = await fetch(`${API}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newTransactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create transaction');
      }

      const createdTransaction = await response.json();
      setTransactions([createdTransaction, ...transactions]);
      setFormData({ symbol: '', name: '', transaction_type: 'buy', quantity: '', price: '', transaction_date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      toast({ title: 'Success', description: 'Transaction added successfully.' });
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteClick = (id) => {
    setShowDeleteConfirm(id);
  };

  const handleConfirmDelete = async (id) => {
    try {
      const response = await fetch(`${API}/transactions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete transaction');
      }

      setTransactions(transactions.filter(t => t.id !== id));
      setShowDeleteConfirm(null);
      toast({ title: 'Success', description: 'Transaction deleted successfully.' });
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const totalBought = transactions
    .filter(t => t.transaction_type === 'buy')
    .reduce((sum, t) => sum + t.total_amount, 0);

  const totalSold = transactions
    .filter(t => t.transaction_type === 'sell')
    .reduce((sum, t) => sum + t.total_amount, 0);

  if (isLoading) {
    return <div className="text-center">Loading transactions...</div>;
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <AlertCircle className="mx-auto h-12 w-12" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Transaction
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600">Total Bought</p>
          <p className="text-2xl font-bold text-green-600">₹{totalBought.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-gray-600">Total Sold</p>
          <p className="text-2xl font-bold text-red-600">₹{totalSold.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600">Net Position</p>
          <p className="text-2xl font-bold text-blue-600">₹{(totalBought - totalSold).toFixed(2)}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Symbol
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                placeholder="e.g., AAPL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per Share
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTransaction}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Add Transaction
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Symbol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quantity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Price</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-500">No transactions found.</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.symbol}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`flex items-center gap-1 ${tx.transaction_type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'buy' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      {tx.transaction_type === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tx.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">₹{tx.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{tx.total_amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tx.transaction_date}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDeleteClick(tx.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>

                  {showDeleteConfirm === tx.id && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white p-6 rounded-lg shadow-lg">
                        <p className="text-gray-900 font-medium mb-4">Delete this transaction?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmDelete(tx.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

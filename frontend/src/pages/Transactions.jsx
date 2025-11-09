import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Trash2, Plus, AlertCircle, RefreshCw, Search } from 'lucide-react';
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

  // New state for enhanced summary and diagnostic
  const [summary, setSummary] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch both transactions and summary in parallel
      const [txnResponse, summaryResponse] = await Promise.all([
        fetch(`${API}/transactions`, { credentials: 'include' }),
        fetch(`${API}/transactions/summary`, { credentials: 'include' })
      ]);

      if (!txnResponse.ok) throw new Error('Failed to fetch transactions');
      if (!summaryResponse.ok) throw new Error('Failed to fetch summary');

      const txnData = await txnResponse.json();
      const summaryData = await summaryResponse.json();

      setTransactions(txnData);
      setSummary(summaryData);
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
      setFormData({ symbol: '', name: '', transaction_type: 'buy', quantity: '', price: '', transaction_date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      toast({ title: 'Success', description: 'Transaction added successfully.' });
      // Refresh transactions and summary
      fetchTransactions();
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
      // Refresh summary after delete
      fetchTransactions();
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDiagnose = async () => {
    try {
      const response = await fetch(`${API}/transactions/diagnostic`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch diagnostic data');
      const data = await response.json();
      setDiagnostic(data);
      setShowDiagnostic(true);
      toast({ title: 'Diagnostic Complete', description: 'Check results below.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleSync = async () => {
    if (!window.confirm('This will create missing transactions for your portfolio holdings. Continue?')) {
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${API}/transactions/sync`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to sync transactions');
      const data = await response.json();

      toast({
        title: 'Sync Complete',
        description: `Created ${data.created_count} missing transactions totaling ₹${data.total_synced_amount.toFixed(2)}`,
      });

      // Refresh data
      fetchTransactions();
      setShowDiagnostic(false);
      setDiagnostic(null);
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
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
        <div className="flex gap-2">
          <button
            onClick={handleDiagnose}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Search className="w-4 h-4" />
            Diagnose
          </button>
          {summary?.has_mismatch && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Transactions'}
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      {summary && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">Total Bought</p>
              <p className="text-2xl font-bold text-green-600">₹{summary.total_bought.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600">Total Sold</p>
              <p className="text-2xl font-bold text-red-600">₹{summary.total_sold.toFixed(2)}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600">Net Invested</p>
              <p className="text-2xl font-bold text-blue-600">₹{summary.net_invested.toFixed(2)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600">Current Value</p>
              <p className="text-2xl font-bold text-purple-600">₹{summary.current_value.toFixed(2)}</p>
            </div>
            <div className={`p-4 rounded-lg border ${summary.total_gain_loss >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <p className="text-sm text-gray-600">Total Gain/Loss</p>
              <p className={`text-2xl font-bold ${summary.total_gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {summary.total_gain_loss >= 0 ? '+' : ''}₹{summary.total_gain_loss.toFixed(2)}
              </p>
              <p className={`text-xs ${summary.total_gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {summary.total_gain_loss_percent >= 0 ? '+' : ''}{summary.total_gain_loss_percent.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Mismatch Warning */}
          {summary.has_mismatch && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Data Mismatch Detected</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  Your portfolio cost basis (₹{summary.portfolio_cost_basis.toFixed(2)}) doesn't match your transaction history (₹{summary.net_invested.toFixed(2)}).
                  This suggests some holdings may be missing buy transactions.
                  Click "Diagnose" to see details or "Sync Transactions" to auto-fix.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Diagnostic Panel */}
      {showDiagnostic && diagnostic && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Diagnostic Report</h2>
            <button
              onClick={() => setShowDiagnostic(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-xs text-gray-600">Portfolio Cost Basis</p>
              <p className="text-lg font-bold">₹{diagnostic.summary.total_portfolio_cost_basis.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-xs text-gray-600">Transaction Net</p>
              <p className="text-lg font-bold">₹{diagnostic.summary.net_from_transactions.toFixed(2)}</p>
            </div>
            <div className={`p-3 rounded border ${diagnostic.summary.has_mismatch ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-xs text-gray-600">Mismatch</p>
              <p className={`text-lg font-bold ${diagnostic.summary.has_mismatch ? 'text-red-600' : 'text-green-600'}`}>
                ₹{Math.abs(diagnostic.summary.mismatch).toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Diagnosis:</p>
            <p className="text-sm text-gray-600">{diagnostic.diagnosis}</p>
          </div>

          {diagnostic.missing_transactions && diagnostic.missing_transactions.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Missing Transactions ({diagnostic.missing_transactions.length}):</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 max-h-60 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {diagnostic.missing_transactions.map((item, idx) => (
                    <li key={idx} className="text-yellow-900">
                      <span className="font-medium">{item.symbol}</span>: {item.quantity} units @ ₹{item.purchase_price.toFixed(2)}
                      = ₹{item.total_cost.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {diagnostic.summary.has_mismatch && (
            <div className="pt-4 border-t">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : `Sync ${diagnostic.missing_transactions.length} Missing Transactions`}
              </button>
            </div>
          )}
        </div>
      )}

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
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <div>
                      <div className="font-medium">{tx.name || tx.symbol}</div>
                      {tx.name && <div className="text-xs text-gray-500">{tx.symbol}</div>}
                    </div>
                  </td>
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

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Trash2, Plus } from 'lucide-react';

export default function Transactions() {
  const [transactions, setTransactions] = useState([
    { id: 1, symbol: 'AAPL', type: 'buy', quantity: 10, price: 150.25, date: '2024-10-15', total: 1502.50 },
    { id: 2, symbol: 'GOOGL', type: 'sell', quantity: 5, price: 140.80, date: '2024-10-14', total: 704.00 },
    { id: 3, symbol: 'MSFT', type: 'buy', quantity: 15, price: 380.50, date: '2024-10-13', total: 5707.50 },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'buy',
    quantity: '',
    price: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleAddTransaction = () => {
    if (formData.symbol && formData.quantity && formData.price) {
      const newTransaction = {
        id: Math.max(...transactions.map(t => t.id), 0) + 1,
        ...formData,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price),
        date: new Date().toISOString().split('T')[0],
        total: parseInt(formData.quantity) * parseFloat(formData.price),
      };
      setTransactions([...transactions, newTransaction]);
      setFormData({ symbol: '', type: 'buy', quantity: '', price: '' });
      setShowForm(false);
    }
  };

  const handleDeleteClick = (id) => {
    setShowDeleteConfirm(id);
  };

  const handleConfirmDelete = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
    setShowDeleteConfirm(null);
  };

  const totalBought = transactions
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.total, 0);

  const totalSold = transactions
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + t.total, 0);

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
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.symbol}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`flex items-center gap-1 ${tx.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'buy' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    {tx.type === 'buy' ? 'BUY' : 'SELL'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{tx.quantity}</td>
                <td className="px-6 py-4 text-sm text-gray-600">₹{tx.price.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">₹{tx.total.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{tx.date}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Bell, Trash2, Edit2, Plus, X } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([
    { id: 1, symbol: 'AAPL', condition: 'Price > $150', active: true },
    { id: 2, symbol: 'GOOGL', condition: 'Price < $100', active: false },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    condition: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleAddAlert = () => {
    if (formData.symbol && formData.condition) {
      const newAlert = {
        id: Math.max(...alerts.map(a => a.id), 0) + 1,
        ...formData,
        active: true,
      };
      setAlerts([...alerts, newAlert]);
      setFormData({ symbol: '', condition: '' });
      setShowForm(false);
    }
  };

  const handleDeleteClick = (id) => {
    setShowDeleteConfirm(id);
  };

  const handleConfirmDelete = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
    setShowDeleteConfirm(null);
  };

  const handleToggleAlert = (id) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, active: !a.active } : a
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bell className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Price Alerts</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Alert
        </button>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alert Condition
              </label>
              <input
                type="text"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="e.g., Price > $150"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddAlert}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Create Alert
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

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{alert.symbol}</p>
              <p className="text-sm text-gray-600">{alert.condition}</p>
              <p className="text-xs text-gray-500 mt-1">
                Status: {alert.active ? '🟢 Active' : '⚪ Inactive'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleAlert(alert.id)}
                className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm"
              >
                {alert.active ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => handleDeleteClick(alert.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {showDeleteConfirm === alert.id && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <p className="text-gray-900 font-medium mb-4">Delete this alert?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmDelete(alert.id)}
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
          </div>
        ))}
      </div>
    </div>
  );
}

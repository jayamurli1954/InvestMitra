import React, { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../hooks/use-toast';
import { API as API_URL } from '@/config/backend';

// Helper to parse condition string
const parseCondition = (conditionStr) => {
  if (typeof conditionStr !== 'string') return { alert_type: 'unknown', target_value: 0 };
  const match = conditionStr.match(/(Price)\s*([><])\s*\$*([0-9.]+)/);
  if (match) {
    const operator = match[2];
    const value = parseFloat(match[3]);
    if (operator === '>') return { alert_type: 'price_above', target_value: value };
    if (operator === '<') return { alert_type: 'price_below', target_value: value };
  }
  return { alert_type: 'custom', target_value: 0 }; // Fallback
};

// Helper to format condition string
const formatCondition = (alert) => {
  if (alert.alert_type === 'price_above') return `Price > $${alert.target_value}`;
  if (alert.alert_type === 'price_below') return `Price < $${alert.target_value}`;
  return alert.condition || 'Custom Alert'; // Fallback
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '', // Name is required by the backend
    condition: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Fetch alerts from backend
  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/alerts`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [isAuthenticated]);

  const handleAddAlert = async () => {
    if (!formData.symbol || !formData.condition) {
      toast({ title: 'Missing Fields', description: 'Please fill in all fields.', variant: 'destructive' });
      return;
    }

    const { alert_type, target_value } = parseCondition(formData.condition);

    const newAlertData = {
      symbol: formData.symbol,
      name: formData.symbol, // Assuming name is the same as symbol for simplicity
      alert_type,
      target_value,
    };

    try {
      const response = await fetch(`${API_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newAlertData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create alert');
      }

      const createdAlert = await response.json();
      setAlerts([...alerts, createdAlert]);
      setFormData({ symbol: '', name: '', condition: '' });
      setShowForm(false);
      toast({ title: 'Success', description: 'Alert created successfully.' });
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
      const response = await fetch(`${API_URL}/alerts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete alert');
      }

      setAlerts(alerts.filter(a => a.id !== id));
      setShowDeleteConfirm(null);
      toast({ title: 'Success', description: 'Alert deleted successfully.' });
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleToggleAlert = async (id, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/alerts/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update alert');
      }

      const updatedAlert = await response.json();
      setAlerts(alerts.map(a => (a.id === id ? updatedAlert : a)));
      toast({ title: 'Success', description: `Alert ${updatedAlert.is_active ? 'enabled' : 'disabled'}.` });
    } catch (err) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="text-center">Loading alerts...</div>;
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
                placeholder="e.g., Price > 150 or Price < 100"
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
        {alerts.length === 0 ? (
          <div className="text-center text-gray-500">No alerts found.</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{alert.symbol}</p>
                <p className="text-sm text-gray-600">{formatCondition(alert)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: {alert.is_active ? '🟢 Active' : '⚪ Inactive'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm"
                >
                  {alert.is_active ? 'Disable' : 'Enable'}
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
          ))
        )}
      </div>
    </div>
  );
}

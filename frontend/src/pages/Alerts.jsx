import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Trash2, Bell, BellOff, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    alert_type: 'price_above',
    target_value: ''
  });

  useEffect(() => {
    fetchAlerts();
    checkAlerts();
    // Check alerts every 5 minutes
    const interval = setInterval(checkAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const checkAlerts = async () => {
    try {
      const response = await axios.get(`${API}/alerts/check`);
      if (response.data.triggered_alerts.length > 0) {
        setTriggeredAlerts(response.data.triggered_alerts);
        response.data.triggered_alerts.forEach(alert => {
          toast.success(
            `Alert Triggered: ${alert.symbol} is ${alert.alert_type === 'price_above' ? 'above' : 'below'} ₹${alert.target_value}`,
            { duration: 10000 }
          );
        });
        fetchAlerts(); // Refresh alerts list
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  };

  const handleCreateAlert = async () => {
    if (!formData.symbol || !formData.target_value) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await axios.post(`${API}/alerts`, {
        ...formData,
        target_value: parseFloat(formData.target_value)
      });
      toast.success('Alert created successfully');
      setDialogOpen(false);
      resetForm();
      fetchAlerts();
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    }
  };

  const handleDeleteAlert = async (id) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      await axios.delete(`${API}/alerts/${id}`);
      toast.success('Alert deleted');
      fetchAlerts();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      alert_type: 'price_above',
      target_value: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.is_active && !a.triggered);
  const inactiveAlerts = alerts.filter(a => a.triggered || !a.is_active);

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Price Alerts</h1>
          <p className="text-slate-400">Get notified when stocks hit your target prices</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={checkAlerts}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
          >
            <Bell className="w-4 h-4 mr-2" />
            Check Alerts
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Alert
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white text-xl">Create Price Alert</DialogTitle>
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
                  <Label className="text-slate-300 text-sm mb-2">Alert Type</Label>
                  <Select value={formData.alert_type} onValueChange={(value) => setFormData({ ...formData, alert_type: value })}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="price_above" className="text-white">
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2 text-emerald-400" />
                          Price Above Target
                        </div>
                      </SelectItem>
                      <SelectItem value="price_below" className="text-white">
                        <div className="flex items-center">
                          <TrendingDown className="w-4 h-4 mr-2 text-rose-400" />
                          Price Below Target
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-300 text-sm mb-2">Target Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2500"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <Button
                    onClick={handleCreateAlert}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    Create Alert
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Active Alerts</span>
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-white">{activeAlerts.length}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Triggered Alerts</span>
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">{inactiveAlerts.length}</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Alerts</span>
            <BellOff className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-3xl font-bold text-white">{alerts.length}</p>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Bell className="w-6 h-6 mr-3 text-emerald-400" />
            Active Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-emerald-500/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{alert.symbol}</h3>
                    <p className="text-sm text-slate-400">{alert.name}</p>
                  </div>
                  <Button
                    onClick={() => handleDeleteAlert(alert.id)}
                    variant="outline"
                    size="sm"
                    className="border-rose-500 text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {alert.alert_type === 'price_above' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-sm text-slate-300">
                      {alert.alert_type === 'price_above' ? 'Above' : 'Below'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">₹{alert.target_value.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">
                    Created: {new Date(alert.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Triggered Alerts */}
      {inactiveAlerts.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <AlertCircle className="w-6 h-6 mr-3 text-amber-400" />
            Triggered / Inactive Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveAlerts.map((alert) => (
              <div key={alert.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 opacity-60">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{alert.symbol}</h3>
                    <p className="text-sm text-slate-400">{alert.name}</p>
                  </div>
                  <Button
                    onClick={() => handleDeleteAlert(alert.id)}
                    variant="outline"
                    size="sm"
                    className="border-rose-500 text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {alert.alert_type === 'price_above' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-sm text-slate-300">
                      {alert.alert_type === 'price_above' ? 'Above' : 'Below'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">₹{alert.target_value.toFixed(2)}</p>
                  {alert.triggered && (
                    <p className="text-xs text-amber-400 font-medium">✓ Triggered</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Alerts Yet</h3>
          <p className="text-slate-400 mb-6">Create price alerts to get notified when stocks hit your targets</p>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Alert
          </Button>
        </div>
      )}
    </div>
  );
};

export default Alerts;

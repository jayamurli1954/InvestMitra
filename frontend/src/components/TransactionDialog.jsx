import { useState } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const TransactionDialog = ({ holding, transactionType, open, onOpenChange, onSuccess }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    quantity: '',
    price: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  const handleTransaction = async () => {
    if (!formData.quantity || !formData.price) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        transaction_type: transactionType,
      };

      await axios.post(`${API}/portfolio/${holding.id}/transact`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`Transaction successful`);
      onSuccess(); // This will trigger a refresh in the parent component
      onOpenChange(false); // Close the dialog
    } catch (error) {      console.error(`Error processing transaction:`, error);
      const errorMessage = error.response?.data?.detail || `Failed to process ${transactionType} transaction`;
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {transactionType === 'buy' ? 'Buy More' : 'Sell'} {holding.symbol || holding.scheme_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Quantity</Label>
            <Input
              type="number"
              placeholder="Number of shares/units"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-300">Price</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Price per share/unit"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-300">Date</Label>
            <Input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Button
            onClick={handleTransaction}
            className={`w-full ${transactionType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
          >
            Confirm {transactionType === 'buy' ? 'Purchase' : 'Sale'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionDialog;
import React from 'react';
import { Button } from '@/components/ui/button';
import StockSearch from '@/components/dashboard/StockSearch';

const AddHoldingModal = ({ isOpen, form, setForm, onClose, onSave }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-white mb-4">Add New Holding</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Symbol</label>
                        <StockSearch
                            onSelect={(symbol) => setForm({ ...form, symbol })}
                            initialValue={form.symbol}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Quantity</label>
                        <input
                            type="number"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="0"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Buy Price (₹)</label>
                        <input
                            type="number"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                            placeholder="0.00"
                            value={form.buy_price}
                            onChange={(e) => setForm({ ...form, buy_price: e.target.value })}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={onClose}>Cancel</Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onSave}>Save Holding</Button>
                </div>
            </div>
        </div>
    );
};

export default AddHoldingModal;


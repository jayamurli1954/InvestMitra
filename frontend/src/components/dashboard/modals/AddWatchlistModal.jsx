import React from 'react';
import { Button } from '@/components/ui/button';
import StockSearch from '@/components/dashboard/StockSearch';

const AddWatchlistModal = ({ isOpen, form, setForm, onClose, onSave }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-white mb-4">Add to Watchlist</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Symbol</label>
                        <StockSearch
                            onSelect={(symbol) => setForm({ ...form, symbol })}
                            initialValue={form.symbol}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={onClose}>Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" onClick={onSave}>Add to Watchlist</Button>
                </div>
            </div>
        </div>
    );
};

export default AddWatchlistModal;


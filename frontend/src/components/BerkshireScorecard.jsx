import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';

export default function BerkshireScorecard({ symbol }) {
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbol) {
      fetchScorecard();
    }
  }, [symbol]);

  const fetchScorecard = async () => {
    try {
      const response = await axios.get(`${API}/stock/${symbol}/berkshire-scorecard`);
      setScorecard(response.data);
    } catch (error) {
      console.error('Error fetching Berkshire scorecard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 my-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-slate-800/60 rounded"></div>
      </div>
    );
  }

  if (!scorecard) return null;

  const { overall_rating, berkshire_score, pillars } = scorecard;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 my-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>🏛️</span> Berkshire Hathaway Fundamental Scorecard
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Buffett & Munger Capital Allocation Matrix for {symbol}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-amber-400">{berkshire_score}</span>
          <span className="text-xs text-slate-500 font-medium">/100 Moat Score</span>
        </div>
      </div>

      <div className="my-4 p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Verdict</span>
        <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-700/40">
          {overall_rating}
        </span>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Pillar 1 */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">1. Economic Moat</span>
            <span className="text-xs text-slate-300 font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/50">
              {pillars?.economic_moat?.score}/100
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200">{pillars?.economic_moat?.rating}</p>
          <p className="text-xs text-slate-400 mt-1">{pillars?.economic_moat?.notes}</p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">2. Capital Allocation</span>
            <span className="text-xs text-slate-300 font-bold px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/50">
              Grade {pillars?.capital_allocation?.grade}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200">Reinvestment Rate: {pillars?.capital_allocation?.reinvestment_rate}</p>
          <p className="text-xs text-slate-400 mt-1">{pillars?.capital_allocation?.notes}</p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">3. Free Cash Flow Conversion</span>
            <span className="text-xs text-slate-300 font-bold px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/50">
              FCF Yield {pillars?.fcf_conversion?.fcf_yield}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200">Conversion Rate: {pillars?.fcf_conversion?.conversion_pct}%</p>
          <p className="text-xs text-slate-400 mt-1">{pillars?.fcf_conversion?.notes}</p>
        </div>

        {/* Pillar 4 */}
        <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">4. Management & Governance</span>
            <span className="text-xs text-slate-300 font-bold px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800/50">
              Pledge {pillars?.management_governance?.pledge_pct}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200">{pillars?.management_governance?.grade}</p>
          <p className="text-xs text-slate-400 mt-1">{pillars?.management_governance?.notes}</p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function DCFWorkbench({ symbol, currentPrice = 100 }) {
  const [growthRate, setGrowthRate] = useState(12);
  const [wacc, setWacc] = useState(11.5);
  const [terminalGrowth, setTerminalGrowth] = useState(4);
  const [eps, setEps] = useState(currentPrice / 25);

  // Dynamic DCF Calculation
  const calculateDCF = () => {
    let futureEps = eps;
    let totalPv = 0;
    for (let i = 1; i <= 10; i++) {
      futureEps *= 1 + growthRate / 100;
      totalPv += futureEps / Math.pow(1 + wacc / 100, i);
    }
    const terminalVal = (futureEps * (1 + terminalGrowth / 100)) / ((wacc - terminalGrowth) / 100);
    const pvTerminal = terminalVal / Math.pow(1 + wacc / 100, 10);
    return Math.max(1, Math.round((totalPv + pvTerminal) * 100) / 100);
  };

  const intrinsicValue = calculateDCF();
  const marginOfSafety = Math.round(((intrinsicValue - currentPrice) / intrinsicValue) * 1000) / 10;
  const isUndervalued = intrinsicValue > currentPrice;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 my-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>🧮</span> Interactive DCF Valuation Workbench
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Adjust intrinsic growth parameters for {symbol || 'Stock'}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
          isUndervalued 
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50' 
            : 'bg-rose-950/80 text-rose-300 border-rose-700/50'
        }`}>
          {isUndervalued ? 'BUY DISCOUNT' : 'PREMIUM VALUATION'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-5">
        {/* Intrinsic Value Card */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 font-medium">Intrinsic Fair Value</span>
          <span className="text-3xl font-extrabold text-emerald-400 my-1">₹{intrinsicValue}</span>
          <span className="text-xs text-slate-500">Current CMP: ₹{currentPrice}</span>
        </div>

        {/* Margin of Safety */}
        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-xl text-center flex flex-col justify-center">
          <span className="text-xs text-slate-400 font-medium">Margin of Safety</span>
          <span className={`text-3xl font-extrabold my-1 ${marginOfSafety >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {marginOfSafety > 0 ? `+${marginOfSafety}%` : `${marginOfSafety}%`}
          </span>
          <span className="text-xs text-slate-500">{marginOfSafety >= 15 ? 'Strong Buffer' : 'Tight Buffer'}</span>
        </div>

        {/* Dynamic Sliders */}
        <div className="space-y-4 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Expected EPS Growth (5Yr)</span>
              <span className="text-emerald-400 font-bold">{growthRate}%</span>
            </div>
            <input
              type="range"
              min="2"
              max="35"
              step="0.5"
              value={growthRate}
              onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
              <span>Discount Rate (WACC)</span>
              <span className="text-amber-400 font-bold">{wacc}%</span>
            </div>
            <input
              type="range"
              min="8"
              max="18"
              step="0.5"
              value={wacc}
              onChange={(e) => setWacc(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

const SCENARIOS = [
  { id: 'covid', name: '2020 COVID Market Crash', drawdown: -28.4, desc: 'Global pandemic demand shock and rapid liquidity selloff.' },
  { id: 'gfc', name: '2008 Global Financial Crisis', drawdown: -45.2, desc: 'Banking liquidity squeeze & deep recessionary systemic shock.' },
  { id: 'rate2024', name: '2024 Volatility & Rate Spike', drawdown: -14.5, desc: 'Central bank interest rate persistence and inflation shock.' },
  { id: 'tech_selloff', name: 'IT & Growth Sector De-rating', drawdown: -18.0, desc: 'Global tech spending slowdown and margin compression.' },
];

export default function CrashSimulator({ totalPortfolioValue = 100000 }) {
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS[0]);

  const estimatedLoss = Math.round(totalPortfolioValue * (Math.abs(selectedScenario.drawdown) / 100));
  const estimatedResidual = Math.round(totalPortfolioValue - estimatedLoss);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 my-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>🛡️</span> Market Crash Stress-Testing Simulator
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Test your portfolio against historical macro market shocks</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/50">
          Stress Test Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Select Historical Shock Scenario
          </label>
          <div className="space-y-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setSelectedScenario(sc)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedScenario.id === sc.id
                    ? 'bg-rose-950/30 border-rose-500/80 text-slate-100 shadow-lg shadow-rose-950/30'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>{sc.name}</span>
                  <span className="text-rose-400">{sc.drawdown}%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{sc.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Simulated Impact Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Current Portfolio Capital:</span>
                <span className="font-bold text-slate-200">₹{totalPortfolioValue.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Simulated Drawdown Loss:</span>
                <span className="font-extrabold text-rose-400">-₹{estimatedLoss.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="font-bold text-slate-300">Resilient Portfolio Floor:</span>
                <span className="font-extrabold text-emerald-400 text-lg">₹{estimatedResidual.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-900/90 border border-slate-800/80 text-xs text-slate-400">
            💡 <span className="text-slate-300 font-medium">Recommendation:</span> Maintaining 15-20% allocation in non-correlated liquid assets or gold hedges reduces max drawdown during systemic shocks.
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

const PERSONAS = [
  { id: 'buffett', name: 'Warren Buffett', tagline: 'Economic Moat & FCF', icon: '🏛️', badge: 'Moat & Value' },
  { id: 'lynch', name: 'Peter Lynch', tagline: 'GARP & Consumer Growth', icon: '📈', badge: 'GARP Growth' },
  { id: 'graham', name: 'Benjamin Graham', tagline: 'Defensive Margin of Safety', icon: '🛡️', badge: 'Deep Value' },
  { id: 'sebi_guard', name: 'SEBI Risk Guard', tagline: 'Governance & Audit Check', icon: '⚖️', badge: 'SEBI Safety' },
];

export default function PersonaSelector({ activePersona, onSelectPersona }) {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <span>🧠</span> Investor AI Personas (Mitra Workbench)
        </h3>
        <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/50">
          AI Multi-Lens Active
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PERSONAS.map((p) => {
          const isSelected = activePersona === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPersona(p.id)}
              className={`flex flex-col text-left p-3 rounded-xl transition-all duration-200 border ${
                isSelected
                  ? 'bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/50 scale-[1.02]'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl">{p.icon}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isSelected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.badge}
                </span>
              </div>
              <span className="font-bold text-slate-100 text-sm">{p.name}</span>
              <span className="text-[11px] text-slate-400 mt-0.5">{p.tagline}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

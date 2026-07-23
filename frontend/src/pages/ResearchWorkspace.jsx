import React, { useState } from 'react';
import { Cpu, ShieldCheck, FileText, CheckCircle2, AlertOctagon, HelpCircle, ArrowUpRight } from 'lucide-react';

export default function ResearchWorkspace() {
  const [symbol, setSymbol] = useState('INDIGO');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateResearch = () => {
    setLoading(true);
    fetch('/api/events/multi-agent-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: 'EVT-2026-001',
        company_symbol: symbol
      })
    })
      .then(res => res.json())
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  };

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-400" />
            AI Research Workspace & Multi-Agent Copilot
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Synthesizing 6 specialist agents: Global Intel, India Market, Company Research, Impact, Risk, and Report.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol (e.g. INDIGO, ASIANPAINT)"
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg uppercase w-48 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleGenerateResearch}
            disabled={loading}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
          >
            {loading ? "Orchestrating Agents..." : "Generate Research"}
          </button>
        </div>
      </div>

      {report ? (
        <div className="space-y-6">
          {/* Executive Overview Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-semibold rounded-md">
                  {report.company?.symbol}
                </span>
                <span className="text-sm text-slate-400">{report.company?.company_name}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">{report.title}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Analytical Rating</span>
              <span className="text-md font-bold text-amber-400">{report.impact?.impact_direction}</span>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bull / Bear Scenarios */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Scenario Analysis (Contrarian Agent)
              </h3>
              
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">Bull Case Scenario</span>
                <p className="text-xs text-slate-300 leading-relaxed">{report.risk_review?.bull_case}</p>
              </div>

              <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-lg">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-1">Bear Case Scenario</span>
                <p className="text-xs text-slate-300 leading-relaxed">{report.risk_review?.bear_case}</p>
              </div>
            </div>

            {/* Citations & Evidence Drawer */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
                <FileText className="w-4 h-4 text-cyan-400" /> Primary Filings & Evidence
              </h3>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {report.citations?.map((cit) => (
                  <div key={cit.citation_number} className="p-3 bg-slate-950 rounded border border-slate-800 text-xs">
                    <div className="flex justify-between font-semibold text-cyan-300 mb-1">
                      <span>[{cit.citation_number}] {cit.document_title}</span>
                      <span className="text-slate-500">{cit.period}</span>
                    </div>
                    <p className="text-slate-400 italic">"{cit.citation_text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mandatory Regulatory Disclaimer */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed">
            <span className="font-semibold text-slate-300 block mb-1">SEBI Governance & Research Compliance</span>
            {report.disclaimer}
          </div>
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-900 border border-slate-800 rounded-xl">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Enter a company symbol above and click "Generate Research" to launch the 6-agent workflow.</p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Radio, AlertTriangle, ShieldAlert, TrendingUp, TrendingDown, Layers, FileText, ArrowRight } from 'lucide-react';

export default function EventRadar() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scope, setScope] = useState(null);
  const [impactAnalysis, setImpactAnalysis] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('INDIGO');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ingest event feed
    fetch('/api/events/feed')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        if (data && data.length > 0) {
          handleSelectEvent(data[0]);
        }
      })
      .catch(err => console.error("Error loading event feed:", err));
  }, []);

  const handleSelectEvent = (evt) => {
    setSelectedEvent(evt);
    setLoading(true);
    fetch(`/api/events/${evt.event_id}/scope`)
      .then(res => res.json())
      .then(data => {
        setScope(data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  };

  const handleRunAnalysis = () => {
    if (!selectedEvent) return;
    setLoading(true);
    fetch('/api/events/analyze-company-impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: selectedEvent.event_id,
        company_symbol: selectedCompany
      })
    })
      .then(res => res.json())
      .then(data => {
        setImpactAnalysis(data);
        setLoading(false);
      })
      .catch(err => setLoading(false));
  };

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Radio className="w-6 h-6 animate-pulse text-emerald-400" />
            Global & Indian Market Event Radar
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time OSINT event intelligence signal propagation into Indian sectors and listed equities.
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-full flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          OSINT Live
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Event Stream Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Ingested Intelligence Signals
          </h2>
          <div className="space-y-3">
            {events.map((evt) => (
              <div
                key={evt.event_id}
                onClick={() => handleSelectEvent(evt)}
                className={`p-4 rounded-lg cursor-pointer transition border ${
                  selectedEvent?.event_id === evt.event_id
                    ? 'bg-slate-800/90 border-emerald-500/50 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="px-2 py-0.5 bg-slate-800 text-cyan-400 rounded font-medium">
                    {evt.event_type}
                  </span>
                  <span className={`font-semibold ${
                    evt.severity === 'HIGH' ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {evt.severity} SEVERITY
                  </span>
                </div>
                <h3 className="text-sm font-medium text-slate-200 line-clamp-2 mt-1">
                  {evt.title}
                </h3>
                <div className="text-xs text-slate-500 mt-2 flex justify-between">
                  <span>{evt.geography}</span>
                  <span>{evt.source_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Sector Taxonomy Scope */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Sector Taxonomy & Exposure Scope
          </h2>

          {selectedEvent ? (
            <div>
              <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 mb-5">
                <h3 className="font-semibold text-sm text-emerald-400 mb-1">
                  {selectedEvent.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {selectedEvent.summary}
                </p>
              </div>

              {scope && (
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" /> Negatively Sensitive Sectors
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scope.negative_sectors?.map((sec, i) => (
                        <span key={i} className="px-2.5 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs rounded-md">
                          {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Positively Sensitive Sectors
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scope.positive_sectors?.length > 0 ? (
                        scope.positive_sectors.map((sec, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs rounded-md">
                            {sec}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">None identified</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <label className="text-xs font-semibold text-slate-300 block mb-2">
                      Select Exposed Company for Deep RAG Analysis
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="INDIGO">INDIGO (InterGlobe Aviation)</option>
                        <option value="ASIANPAINT">ASIANPAINT (Asian Paints)</option>
                        <option value="RELIANCE">RELIANCE (Reliance Industries)</option>
                        <option value="TCS">TCS (Tata Consultancy Services)</option>
                      </select>
                      <button
                        onClick={handleRunAnalysis}
                        disabled={loading}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                      >
                        Run Impact <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500 text-xs py-12">
              Select an ingested signal on the left to inspect sector scope
            </div>
          )}
        </div>

        {/* Right Column: Impact Analysis & Citation Output */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Evidence-Backed Impact Assessment
          </h2>

          {impactAnalysis ? (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Asset</span>
                  <span className="font-bold text-slate-200 text-sm">{impactAnalysis.target_company?.symbol}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Impact Horizon</span>
                  <span className="font-semibold text-amber-400">{impactAnalysis.impact_assessment?.impact_direction}</span>
                </div>
              </div>

              {/* RAG Citations */}
              <div>
                <span className="font-semibold text-slate-300 block mb-2">Verifiable Corporate Citations</span>
                <div className="space-y-2">
                  {impactAnalysis.evidence_citations?.map((cit) => (
                    <div key={cit.citation_number} className="p-3 bg-slate-950/90 rounded border border-slate-800">
                      <div className="flex justify-between text-[11px] text-cyan-400 font-medium mb-1">
                        <span>[{cit.citation_number}] {cit.document_title}</span>
                        <span>{cit.period}</span>
                      </div>
                      <p className="text-slate-300 italic text-[11px] leading-relaxed">
                        "{cit.citation_text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Review */}
              {impactAnalysis.contrarian_risk_review && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg space-y-2">
                  <span className="font-semibold text-rose-400 block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Thesis Breakers to Monitor
                  </span>
                  <ul className="list-disc list-inside text-slate-300 space-y-1">
                    {impactAnalysis.contrarian_risk_review.thesis_breakers?.map((tb, idx) => (
                      <li key={idx}>{tb}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Compliance Disclaimer */}
              <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">
                {impactAnalysis.disclaimer}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-xs py-12">
              Run impact analysis to view evidence chunks & thesis breakers
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Link2, RefreshCw, Trash2, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';

const FIELD_LABELS = {
  api_key: 'API Key',
  client_code: 'Client Code / ID',
  mpin: 'MPIN / Password',
  totp_secret: 'TOTP Secret (base32)',
  secret_id: 'Secret ID',
  redirect_uri: 'Redirect URL',
};
const SECRET_FIELDS = new Set(['mpin', 'totp_secret', 'secret_id', 'api_key']);

export default function BrokerConnections() {
  const [supported, setSupported] = useState([]);
  const [connections, setConnections] = useState([]);
  const [forms, setForms] = useState({});          // broker -> field values
  const [busy, setBusy] = useState('');             // broker currently connecting/disconnecting
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [sup, conn] = await Promise.all([
        axios.get(`${API}/broker/supported`),
        axios.get(`${API}/broker/connections`),
      ]);
      setSupported(sup.data?.brokers || []);
      setConnections(conn.data?.connections || []);
    } catch (e) {
      setError('Could not load broker connections.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const connectedMap = Object.fromEntries((connections || []).map((c) => [c.broker, c]));

  const setField = (broker, field, value) =>
    setForms((f) => ({ ...f, [broker]: { ...(f[broker] || {}), [field]: value } }));

  const connect = async (broker, fields) => {
    setError(''); setBusy(broker);
    try {
      const credentials = {};
      fields.forEach((f) => { credentials[f] = (forms[broker] || {})[f] || ''; });
      await axios.post(`${API}/broker/connect`, { broker, credentials });
      setForms((f) => ({ ...f, [broker]: {} }));
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || `Could not connect ${broker}.`);
    } finally { setBusy(''); }
  };

  const disconnect = async (broker) => {
    setBusy(broker);
    try {
      await axios.delete(`${API}/broker/connections/${encodeURIComponent(broker)}`);
      await load();
    } catch (e) {
      setError(`Could not disconnect ${broker}.`);
    } finally { setBusy(''); }
  };

  const syncHoldings = async () => {
    setSyncing(true); setSyncResult(null); setError('');
    try {
      const res = await axios.post(`${API}/portfolio/sync-broker`);
      setSyncResult(res.data);
      await load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Holdings sync failed.');
    } finally { setSyncing(false); }
  };

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <Link2 className="w-6 h-6" /> Broker Connections
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Connect your broker accounts to auto-import holdings into your consolidated portfolio.
          </p>
        </div>
        <button
          onClick={syncHoldings}
          disabled={syncing || connections.length === 0}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-semibold text-sm rounded-lg flex items-center gap-2"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync Holdings
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 mb-5 bg-slate-900/60 border border-slate-800 rounded-lg p-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        Read-only. Your credentials are encrypted and stored only to fetch your holdings — never to place trades.
      </div>

      {error && <div className="mb-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">{error}</div>}

      {syncResult && (
        <div className="mb-5 text-sm bg-slate-900 border border-emerald-500/30 rounded-lg p-4">
          <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Sync complete
          </div>
          {Object.keys(syncResult.synced || {}).length === 0
            ? <div className="text-slate-400">{syncResult.note}</div>
            : Object.entries(syncResult.synced).map(([b, r]) => (
                <div key={b} className="text-slate-300">
                  {b}: imported {r.imported}
                  {r.skipped_manual?.length ? `, skipped ${r.skipped_manual.length} already tracked manually` : ''}
                </div>
              ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {supported.map((b) => {
          const conn = connectedMap[b.broker];
          const isOAuth = b.auth === 'oauth';
          return (
            <div key={b.broker} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-100">{b.broker}</h3>
                {conn ? (
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs rounded-full">Connected</span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-700/40 text-slate-400 border border-slate-600/40 text-xs rounded-full">Not connected</span>
                )}
              </div>

              {conn ? (
                <div className="text-xs text-slate-400 space-y-2">
                  {conn.last_synced && <div>Last synced: {new Date(conn.last_synced).toLocaleString()}</div>}
                  <button
                    onClick={() => disconnect(b.broker)}
                    disabled={busy === b.broker}
                    className="mt-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs rounded-lg flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Disconnect
                  </button>
                </div>
              ) : isOAuth ? (
                <div className="text-xs text-slate-500 italic">OAuth connect flow coming soon.</div>
              ) : (
                <div className="space-y-2">
                  {(b.fields || []).map((f) => (
                    <input
                      key={f}
                      type={SECRET_FIELDS.has(f) ? 'password' : 'text'}
                      placeholder={FIELD_LABELS[f] || f}
                      value={(forms[b.broker] || {})[f] || ''}
                      onChange={(e) => setField(b.broker, f, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  ))}
                  <button
                    onClick={() => connect(b.broker, b.fields || [])}
                    disabled={busy === b.broker}
                    className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg flex items-center justify-center gap-1"
                  >
                    {busy === b.broker ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Connect {b.broker}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

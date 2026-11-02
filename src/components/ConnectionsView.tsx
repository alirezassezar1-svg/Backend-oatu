/**
 * NONONICK AUTOMATION ENGINE
 * Secure Connections Manager
 */

import React, { useState } from 'react';
import { 
  Link2, 
  Plus, 
  Trash2, 
  Globe, 
  Mail, 
  Database, 
  Webhook, 
  Lock, 
  ShieldCheck 
} from 'lucide-react';
import { Connection } from '../types/index.js';

interface ConnectionsViewProps {
  connections: Connection[];
  onCreateConnection: (conn: Partial<Connection>) => void;
  onDeleteConnection: (id: string) => void;
}

export const ConnectionsView: React.FC<ConnectionsViewProps> = ({
  connections,
  onCreateConnection,
  onDeleteConnection
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'http' | 'email' | 'database' | 'webhook'>('http');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onCreateConnection({
      name,
      type,
      config: {
        baseUrl: baseUrl || undefined,
        authHeader: apiKey ? `Bearer ${apiKey}` : undefined
      }
    });
    setName('');
    setBaseUrl('');
    setApiKey('');
    setShowModal(false);
  };

  const getIcon = (t: string) => {
    switch (t) {
      case 'http': return <Globe className="w-4 h-4 text-cyan-400" />;
      case 'email': return <Mail className="w-4 h-4 text-purple-400" />;
      case 'database': return <Database className="w-4 h-4 text-blue-400" />;
      default: return <Webhook className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Connections & Credentials</h1>
          <p className="text-xs text-slate-400">Encrypted server-side connectors for APIs, SMTP relays, and databases</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Connection</span>
        </button>
      </div>

      <div className="flex items-center gap-2 p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-xs text-slate-300">
        <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
        <span>All tokens and credentials are encrypted and masked on the server. Never exposed to browser scripts.</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {connections.map((conn) => (
          <div key={conn.id} className="glass-panel p-4 rounded-2xl border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-900 border border-white/[0.08]">
                  {getIcon(conn.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{conn.name}</h3>
                  <span className="text-[10px] uppercase font-mono text-cyan-400">{conn.type}</span>
                </div>
              </div>

              <button
                onClick={() => onDeleteConnection(conn.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#05070b] p-2.5 rounded-xl border border-white/[0.04] text-[11px] font-mono text-slate-300 space-y-1">
              {conn.config?.baseUrl && <div><span className="text-slate-500">URL:</span> {conn.config.baseUrl}</div>}
              {conn.config?.authHeader && (
                <div className="flex items-center gap-1 text-slate-400">
                  <Lock className="w-3 h-3 text-cyan-400" />
                  <span>Auth: <code className="text-cyan-300">{conn.config.authHeader}</code></span>
                </div>
              )}
              {conn.config?.smtpHost && <div><span className="text-slate-500">SMTP:</span> {conn.config.smtpHost}:{conn.config.smtpPort}</div>}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#0a0e17] border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_35px_rgba(6,182,212,0.15)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create New Connection</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Connection Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Production API Endpoint"
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="http">HTTP API Gateway</option>
                <option value="email">Email / SMTP Relay</option>
                <option value="database">Database</option>
                <option value="webhook">External Webhook</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Base URL / Host</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://api.gateway.internal"
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Secret API Key / Token</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Save Connection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

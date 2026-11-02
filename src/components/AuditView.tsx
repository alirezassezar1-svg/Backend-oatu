/**
 * NONONICK AUTOMATION ENGINE
 * System Audit & Activity Logs
 */

import React, { useState } from 'react';
import { 
  FileText, 
  RotateCw, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Search 
} from 'lucide-react';
import { AuditLogEntry } from '../types/index.js';

interface AuditViewProps {
  logs: AuditLogEntry[];
  onRefresh: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({ logs, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.details || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Audit Trail</h1>
          <p className="text-xs text-slate-400">Security event logging, workflow lifecycle tracking, and actor auditing</p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.08] hover:border-cyan-500/30 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all active:scale-95"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Filter audit logs by action, resource, or details..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      <div className="glass-panel rounded-2xl border border-white/[0.06] divide-y divide-white/[0.04] overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">No audit events found.</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="p-3.5 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {log.result === 'SUCCESS' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className="text-xs font-mono font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="text-xs text-slate-300 font-medium truncate">
                    {log.resource}
                  </span>
                </div>
                {log.details && (
                  <p className="text-xs text-slate-400">
                    {log.details}
                  </p>
                )}
                <div className="text-[10px] text-slate-500 font-mono">
                  Actor: <span className="text-slate-400">{log.user}</span>
                  {log.ip && <span> • IP: {log.ip}</span>}
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

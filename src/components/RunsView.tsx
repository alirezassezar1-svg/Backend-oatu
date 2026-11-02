/**
 * NONONICK AUTOMATION ENGINE
 * Execution Runs History & Step-by-Step Timeline Inspector
 */

import React, { useState } from 'react';
import { 
  Play, 
  RotateCw, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  Filter, 
  ChevronRight, 
  Copy, 
  Check, 
  Terminal,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { ExecutionRecord, StepLog } from '../types/index.js';

interface RunsViewProps {
  executions: ExecutionRecord[];
  selectedRunId: string | null;
  onSelectRun: (id: string | null) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onRefresh: () => void;
}

export const RunsView: React.FC<RunsViewProps> = ({
  executions,
  selectedRunId,
  onSelectRun,
  onRetry,
  onCancel,
  onRefresh
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedRun = executions.find(e => e.id === selectedRunId) || null;

  const filteredRuns = executions.filter(e => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'test') return e.is_test;
    return e.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Execution Runs</h1>
          <p className="text-xs text-slate-400">Deterministic execution history, step timelines, and error recovery</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.08] hover:border-cyan-500/30 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-all active:scale-95"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['all', 'success', 'failed', 'running', 'queued', 'retrying', 'test'].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize cursor-pointer transition-all whitespace-nowrap ${
              statusFilter === f
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                : 'bg-slate-900/60 text-slate-400 border border-white/[0.05] hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Runs List & Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Runs List (5 or 12 Cols) */}
        <div className={`space-y-2.5 ${selectedRun ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {filteredRuns.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-400 border border-white/[0.06]">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-white">No execution records found</p>
              <p className="text-xs text-slate-400 mt-1">Run any workflow or invoke a webhook to see execution timelines here.</p>
            </div>
          ) : (
            filteredRuns.map((run) => {
              const isSelected = selectedRunId === run.id;
              return (
                <div
                  key={run.id}
                  onClick={() => onSelectRun(run.id)}
                  className={`glass-panel p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-500/50 bg-slate-900/90 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {run.status === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {run.status === 'FAILED' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                      {run.status === 'RUNNING' && <Activity className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />}
                      {run.status === 'QUEUED' && <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
                      {run.status === 'RETRYING' && <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />}
                      {run.status === 'CANCELLED' && <Ban className="w-4 h-4 text-slate-500 shrink-0" />}

                      <span className="text-xs font-bold text-white truncate">
                        {run.workflow_name}
                      </span>

                      {run.is_test && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30 uppercase font-bold">
                          TEST
                        </span>
                      )}
                    </div>

                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold shrink-0 ${
                      run.status === 'SUCCESS' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' :
                      run.status === 'FAILED' ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30' :
                      run.status === 'RUNNING' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {run.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-mono">
                    <span className="truncate">{new Date(run.created_at).toLocaleString()}</span>
                    <span>{run.duration_ms}ms</span>
                  </div>

                  {run.error && (
                    <div className="mt-2 text-[11px] text-rose-400 bg-rose-950/40 p-1.5 rounded border border-rose-500/20 truncate">
                      {run.error}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Run Deep Timeline Inspector (7 Cols) */}
        {selectedRun && (
          <div className="lg:col-span-7 glass-panel rounded-2xl border border-cyan-500/30 p-4 sm:p-5 space-y-4">
            {/* Inspector Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Execution Timeline</h3>
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    selectedRun.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300' :
                    selectedRun.status === 'FAILED' ? 'bg-rose-950 text-rose-300' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {selectedRun.status}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  ID: <span className="text-cyan-300">{selectedRun.id}</span> • {selectedRun.steps.length} steps recorded
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedRun.status === 'FAILED' && (
                  <button
                    onClick={() => onRetry(selectedRun.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry Run</span>
                  </button>
                )}

                {(selectedRun.status === 'RUNNING' || selectedRun.status === 'QUEUED') && (
                  <button
                    onClick={() => onCancel(selectedRun.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 text-xs font-semibold cursor-pointer transition-all"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectRun(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error Detail Banner if Failed (Section 21) */}
            {selectedRun.error && (
              <div className="rounded-xl bg-rose-950/60 border border-rose-500/40 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Execution Failure Details</span>
                </div>
                <p className="text-xs text-rose-200 font-mono bg-black/40 p-2 rounded">
                  {selectedRun.error}
                </p>
                <div className="text-[11px] text-rose-300/80 font-mono flex items-center justify-between">
                  <span>Attempt: {selectedRun.attempt_number} of {selectedRun.max_retries}</span>
                  {selectedRun.next_retry_at && (
                    <span>Next automated retry: {new Date(selectedRun.next_retry_at).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            )}

            {/* Step-by-Step Chronological Pipeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Deterministic Step Breakdown</span>
              </h4>

              <div className="space-y-2.5">
                {selectedRun.steps.map((step, idx) => (
                  <div key={step.id} className="bg-slate-900/80 rounded-xl border border-white/[0.06] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-mono text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white">{step.node_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {step.action || step.node_type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-400">{step.duration_ms}ms</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                          step.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                    </div>

                    {/* Masked Output Inspector */}
                    {step.output && (
                      <div className="bg-[#05070b] p-2 rounded-lg border border-white/[0.04] text-[11px] font-mono">
                        <div className="flex items-center justify-between text-slate-400 mb-1">
                          <span className="text-[10px] uppercase font-semibold">Step Output (Masked)</span>
                          <button
                            onClick={() => copyToClipboard(JSON.stringify(step.output, null, 2), `step_${step.id}`)}
                            className="text-[10px] flex items-center gap-1 hover:text-cyan-300 cursor-pointer"
                          >
                            {copiedKey === `step_${step.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>Copy</span>
                          </button>
                        </div>
                        <pre className="text-slate-300 max-h-36 overflow-y-auto overflow-x-auto text-[10px]">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trigger Data Inspector */}
            {selectedRun.trigger_data && (
              <div className="pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold uppercase text-[10px]">Trigger Payload Snapshot</span>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedRun.trigger_data, null, 2), 'trig_data')}
                    className="text-[10px] flex items-center gap-1 hover:text-cyan-300 cursor-pointer font-mono"
                  >
                    {copiedKey === 'trig_data' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
                <pre className="bg-[#05070b] p-2.5 rounded-lg border border-white/[0.04] text-[10px] font-mono text-slate-300 max-h-32 overflow-y-auto">
                  {JSON.stringify(selectedRun.trigger_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

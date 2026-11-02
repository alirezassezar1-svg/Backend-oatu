/**
 * NONONICK AUTOMATION ENGINE
 * Real-time Dashboard View with Live Database Metrics
 */

import React from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Cpu, 
  GitFork, 
  AlertTriangle, 
  ArrowRight, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import { DashboardMetrics, ExecutionRecord, Workflow } from '../types/index.js';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  workflows: Workflow[];
  onSelectWorkflow: (id: string) => void;
  onSelectRun: (id: string) => void;
  onNewWorkflow: () => void;
  onQuickRun: (wfId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  workflows,
  onSelectWorkflow,
  onSelectRun,
  onNewWorkflow,
  onQuickRun
}) => {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner / System Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0d1322] to-[#07090e] border border-cyan-500/20 p-5 shadow-[0_0_30px_rgba(6,182,212,0.06)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-cyan-400">
                Core Execution Engine Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Automation Operations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Deterministic, zero-AI workflow orchestration and execution monitor.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onNewWorkflow}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.25)] cursor-pointer active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Workflow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (All values come straight from real DB) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active Workflows */}
        <div className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Workflows</span>
            <GitFork className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {metrics.activeWorkflows}
            </span>
            <span className="text-[11px] text-slate-400">
              of {workflows.length} total
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {metrics.pausedWorkflows} paused, {metrics.draftWorkflows} draft
          </div>
        </div>

        {/* Executions Today */}
        <div className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Executions Today</span>
            <Play className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {metrics.executionsToday}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              {metrics.successRatePercentage}% success
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {metrics.successfulExecutions} succeeded, {metrics.failedExecutions} failed
          </div>
        </div>

        {/* Engine Worker & Queue Depth */}
        <div className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Engine Workers</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {metrics.runningJobs}
            </span>
            <span className="text-[11px] text-slate-400">running</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">
            {metrics.queuedJobs} queued jobs
          </div>
        </div>

        {/* Avg Duration */}
        <div className="glass-panel p-4 rounded-xl border border-white/[0.06] hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Execution Time</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {metrics.averageExecutionDurationMs > 0 ? `${metrics.averageExecutionDurationMs}ms` : '0ms'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Deterministic step latency
          </div>
        </div>
      </div>

      {/* Failed Workflows Warning Strip (If Any Real Failures) */}
      {metrics.failedWorkflows.length > 0 && (
        <div className="rounded-xl bg-rose-950/40 border border-rose-500/30 p-4">
          <div className="flex items-center gap-2.5 text-rose-300 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Failed Workflows Require Attention ({metrics.failedWorkflows.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {metrics.failedWorkflows.map(wf => (
              <div 
                key={wf.id}
                onClick={() => onSelectWorkflow(wf.id)}
                className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-rose-500/20 hover:border-rose-400/40 cursor-pointer transition-all"
              >
                <div>
                  <div className="text-xs font-medium text-white">{wf.name}</div>
                  <div className="text-[10px] text-rose-400 font-mono">
                    {wf.failure_count} failures recorded
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickRun(wf.id);
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded cursor-pointer"
                >
                  Retry Run
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Launchpad & Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Active Workflows Quick Controller */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Available Automations</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">{workflows.length} configured</span>
          </div>

          {workflows.length === 0 ? (
            <div className="glass-panel rounded-xl p-8 text-center text-slate-400">
              <GitFork className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium">No automations yet.</p>
              <p className="text-xs text-slate-400 mt-1">Create your first deterministic workflow pipeline.</p>
              <button
                onClick={onNewWorkflow}
                className="mt-4 px-4 py-2 text-xs font-semibold bg-cyan-500 text-slate-950 rounded-lg cursor-pointer"
              >
                Create First Workflow
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {workflows.slice(0, 5).map(wf => (
                <div
                  key={wf.id}
                  onClick={() => onSelectWorkflow(wf.id)}
                  className="glass-panel p-3.5 rounded-xl border border-white/[0.06] hover:border-cyan-500/30 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      wf.status === 'ACTIVE' ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4]' :
                      wf.status === 'PAUSED' ? 'bg-amber-400' : 'bg-slate-500'
                    }`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                          {wf.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          v{wf.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                        <span className="capitalize text-slate-300 font-mono">{wf.trigger.type}</span>
                        <span>•</span>
                        <span>{wf.nodes.length} nodes</span>
                        <span>•</span>
                        <span>{wf.execution_count} runs</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickRun(wf.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium cursor-pointer transition-all active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-cyan-300" />
                      <span className="hidden sm:inline">Run Now</span>
                    </button>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Recent Activity Timeline */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Recent Activity</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Real execution stream</span>
          </div>

          {metrics.recentActivity.length === 0 ? (
            <div className="glass-panel rounded-xl p-6 text-center text-slate-400">
              <Activity className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-xs font-medium">No executions today.</p>
              <p className="text-[11px] text-slate-400 mt-1">Press "Run Now" on any workflow to start an execution.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-xl p-3 border border-white/[0.06] divide-y divide-white/[0.04]">
              {metrics.recentActivity.slice(0, 6).map((run) => (
                <div
                  key={run.id}
                  onClick={() => onSelectRun(run.id)}
                  className="py-2.5 px-2 hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {run.status === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      {run.status === 'FAILED' && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                      {run.status === 'RUNNING' && <Activity className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />}
                      {run.status === 'QUEUED' && <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                      {run.status === 'RETRYING' && <AlertTriangle className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                      <span className="text-xs font-medium text-white truncate">
                        {run.workflow_name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>{new Date(run.created_at).toLocaleTimeString()}</span>
                      {run.duration_ms > 0 && <span>{run.duration_ms}ms</span>}
                      {run.is_test && (
                        <span className="text-purple-300 bg-purple-900/40 px-1 rounded">TEST</span>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                    run.status === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                    run.status === 'FAILED' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' :
                    run.status === 'RUNNING' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {run.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

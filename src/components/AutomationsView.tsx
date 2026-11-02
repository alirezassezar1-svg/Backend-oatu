/**
 * NONONICK AUTOMATION ENGINE
 * Automations List View & Management
 */

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Copy, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle,
  GitFork,
  Webhook,
  Calendar,
  FileCode,
  Database
} from 'lucide-react';
import { Workflow, WorkflowStatus } from '../types/index.js';

interface AutomationsViewProps {
  workflows: Workflow[];
  onSelectWorkflow: (id: string) => void;
  onNewWorkflow: () => void;
  onRunNow: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  workflows,
  onSelectWorkflow,
  onNewWorkflow,
  onRunNow,
  onPause,
  onResume,
  onDuplicate,
  onDelete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredWorkflows = workflows.filter(wf => {
    const matchesSearch = 
      wf.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wf.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || wf.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'webhook': return <Webhook className="w-3.5 h-3.5 text-cyan-400" />;
      case 'schedule': return <Calendar className="w-3.5 h-3.5 text-purple-400" />;
      case 'database_event': return <Database className="w-3.5 h-3.5 text-blue-400" />;
      default: return <GitFork className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Workflows</h1>
          <p className="text-xs text-slate-400">Manage and execute production automation pipelines</p>
        </div>

        <button
          onClick={onNewWorkflow}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search workflows by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'active', 'paused', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap cursor-pointer transition-all ${
                statusFilter === status
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-white/[0.05] hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Workflows List */}
      {filteredWorkflows.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-slate-400 border border-white/[0.06]">
          <GitFork className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">No automations found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No workflows matched your query.' : 'Get started by creating your first automated pipeline.'}
          </p>
          <button
            onClick={onNewWorkflow}
            className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
          >
            Create First Workflow
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkflows.map((wf) => (
            <div
              key={wf.id}
              className="glass-panel p-4 rounded-2xl border border-white/[0.06] hover:border-cyan-500/30 transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
            >
              {/* Workflow Details */}
              <div 
                onClick={() => onSelectWorkflow(wf.id)}
                className="flex-1 min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    wf.status === 'ACTIVE' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30' :
                    wf.status === 'PAUSED' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {wf.status}
                  </span>

                  <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-white/[0.04]">
                    v{wf.version}
                  </span>

                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
                    {getTriggerIcon(wf.trigger.type)}
                    <span className="capitalize">{wf.trigger.type}</span>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white mt-1 hover:text-cyan-300 transition-colors">
                  {wf.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  {wf.description || 'No description provided.'}
                </p>

                {/* Metrics pill */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono flex-wrap">
                  <span>{wf.nodes.length} nodes</span>
                  <span>•</span>
                  <span>{wf.execution_count} total runs</span>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {wf.success_count}
                  </span>
                  {wf.failure_count > 0 && (
                    <span className="text-rose-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      {wf.failure_count}
                    </span>
                  )}
                  {wf.last_run_at && (
                    <>
                      <span>•</span>
                      <span className="text-slate-400">
                        Last run {new Date(wf.last_run_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06] justify-between md:justify-end">
                {/* Run Now Button */}
                <button
                  onClick={() => onRunNow(wf.id)}
                  title="Run Now"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 to-blue-500/15 hover:from-cyan-500/25 hover:to-blue-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                >
                  <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                  <span>Run Now</span>
                </button>

                {/* Pause/Resume Toggle */}
                {wf.status === 'ACTIVE' ? (
                  <button
                    onClick={() => onPause(wf.id)}
                    title="Pause automation"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-amber-500/20 text-xs cursor-pointer transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => onResume(wf.id)}
                    title="Resume automation"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 text-xs cursor-pointer transition-colors"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}

                {/* Edit Builder */}
                <button
                  onClick={() => onSelectWorkflow(wf.id)}
                  title="Open visual workflow builder"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/[0.06] text-xs cursor-pointer transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => onDuplicate(wf.id)}
                  title="Duplicate workflow"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/[0.06] text-xs cursor-pointer transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {/* Delete */}
                {confirmDeleteId === wf.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDelete(wf.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2 py-1 text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 text-[11px] bg-slate-800 text-slate-300 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(wf.id)}
                    title="Delete workflow"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-white/[0.06] text-xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

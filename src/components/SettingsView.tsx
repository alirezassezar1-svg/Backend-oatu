/**
 * NONONICK AUTOMATION ENGINE
 * Settings, Templates, Backups & Architecture Info
 */

import React, { useState } from 'react';
import { 
  Settings2, 
  Download, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  CheckCircle2, 
  Layers, 
  Database,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/api.js';

interface SettingsViewProps {
  onTemplateInstantiated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onTemplateInstantiated }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [instantiatingId, setInstantiatingId] = useState<string | null>(null);

  const templates = [
    {
      id: 'tmpl_lead_pipeline',
      name: 'High-Value Lead Intake & Alert',
      description: 'Webhook listener that filters incoming leads with budgets >= $3,000, writes to CRM table, and sends sales email.',
      nodes: 4,
      category: 'Sales & Growth'
    },
    {
      id: 'tmpl_health_monitor',
      name: 'Hourly Service Health Watcher',
      description: 'Periodic HTTP GET health checks with automatic status logging and error escalation.',
      nodes: 3,
      category: 'DevOps & Reliability'
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await api.exportBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nononick-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    try {
      const parsed = JSON.parse(importText);
      const workflows = Array.isArray(parsed) ? parsed : parsed.workflows || [parsed];
      const res = await api.importWorkflows(workflows);
      setImportStatus(`Successfully imported ${res.importedCount} workflow(s)!`);
      setImportText('');
      onTemplateInstantiated();
    } catch (err: any) {
      setImportStatus('Import failed: ' + err.message);
    }
  };

  const handleInstantiate = async (templateId: string) => {
    setInstantiatingId(templateId);
    try {
      await api.instantiateTemplate(templateId);
      onTemplateInstantiated();
    } catch (err: any) {
      alert('Failed to instantiate template: ' + err.message);
    } finally {
      setInstantiatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System Settings & Templates</h1>
        <p className="text-xs text-slate-400">Templates library, JSON backups, and deterministic engine compliance</p>
      </div>

      {/* Production Workflow Templates Library (Section 25) */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Ready-to-Use Workflow Templates</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="glass-panel p-4 rounded-2xl border border-white/[0.06] hover:border-cyan-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{tmpl.nodes} nodes</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-2">{tmpl.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{tmpl.description}</p>
              </div>

              <div className="pt-4 mt-2 border-t border-white/[0.04]">
                <button
                  onClick={() => handleInstantiate(tmpl.id)}
                  disabled={instantiatingId === tmpl.id}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{instantiatingId === tmpl.id ? 'Instantiating...' : 'Instantiate Template'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Backup & JSON Migration (Section 35 & 36) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Export Card */}
        <div className="glass-panel p-4 rounded-2xl border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Export & Backup Database</h3>
          </div>
          <p className="text-xs text-slate-400">
            Exports all workflows, collection records, and settings as a clean, standardized JSON backup. Private credentials and API keys are automatically masked.
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Download JSON Backup'}</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="glass-panel p-4 rounded-2xl border border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Import Workflow JSON</h3>
          </div>
          <p className="text-xs text-slate-400">
            Paste valid workflow JSON below to import into your workspace. Workflows are initially imported in DRAFT mode for verification.
          </p>
          <textarea
            rows={3}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder='{"name": "Imported Pipeline", "trigger": {...}, "nodes": [...]}'
            className="w-full p-2 bg-[#05070b] border border-white/[0.08] rounded-xl text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleImport}
            className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            Import Workflows
          </button>
          {importStatus && (
            <div className="text-xs font-mono text-cyan-300 bg-cyan-950/40 p-2 rounded">
              {importStatus}
            </div>
          )}
        </div>

      </div>

      {/* Engine Architecture & Zero-AI Compliance Card */}
      <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 space-y-3 bg-gradient-to-br from-slate-900/60 to-[#07090e]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Architecture & Compliance Verification</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/[0.06]">
            <div className="font-bold text-white">Deterministic Execution</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Strict condition rules and action handlers. Zero stochastic AI decision making.</p>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/[0.06]">
            <div className="font-bold text-white">Server-Authoritative</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Schedules, triggers, and queues execute server-side independent of browser tabs.</p>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-white/[0.06]">
            <div className="font-bold text-white">Masked Audit Logging</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sensitive credentials and tokens are scrubbed from execution outputs and logs.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

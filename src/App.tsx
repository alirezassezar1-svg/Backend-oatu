/**
 * NONONICK AUTOMATION ENGINE
 * Root Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { Navigation, NavTab } from './components/Navigation.js';
import { DashboardView } from './components/DashboardView.js';
import { AutomationsView } from './components/AutomationsView.js';
import { WorkflowEditor } from './components/WorkflowEditor.js';
import { RunsView } from './components/RunsView.js';
import { WebhooksView } from './components/WebhooksView.js';
import { ConnectionsView } from './components/ConnectionsView.js';
import { AuditView } from './components/AuditView.js';
import { SettingsView } from './components/SettingsView.js';
import { api } from './lib/api.js';
import { 
  Workflow, 
  ExecutionRecord, 
  DashboardMetrics, 
  Connection, 
  AuditLogEntry 
} from './types/index.js';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [wfList, execList, metData, connList, auditList] = await Promise.all([
        api.getWorkflows(),
        api.getExecutions({ limit: 50 }),
        api.getMetrics(),
        api.getConnections(),
        api.getAuditLogs()
      ]);
      setWorkflows(wfList);
      setExecutions(execList);
      setMetrics(metData);
      setConnections(connList);
      setAuditLogs(auditList);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  }, []);

  // Initial Data Load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Real-time Server-Sent Events (SSE) Listener (Section 32)
  useEffect(() => {
    let sse: EventSource | null = null;
    try {
      sse = new EventSource('/api/events');
      sse.onopen = () => setIsConnected(true);
      sse.onerror = () => setIsConnected(false);
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.id && data.workflow_id) {
            // Execution update received
            const exec: ExecutionRecord = data;
            setExecutions(prev => {
              const idx = prev.findIndex(e => e.id === exec.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = exec;
                return updated;
              }
              return [exec, ...prev];
            });

            // Update metrics gently
            api.getMetrics().then(setMetrics).catch(() => {});
          }
        } catch {
          // ignore heartbeats
        }
      };
    } catch (err) {
      console.warn('SSE not supported or connection error, using fallback');
    }

    // Polling fallback every 6 seconds for metrics
    const interval = setInterval(() => {
      api.getMetrics().then(setMetrics).catch(() => {});
    }, 6000);

    return () => {
      if (sse) sse.close();
      clearInterval(interval);
    };
  }, []);

  // Workflow Handlers
  const handleNewWorkflow = async () => {
    try {
      const newWf = await api.createWorkflow({
        name: `Automated Workflow ${workflows.length + 1}`,
        description: 'Deterministic rule & action pipeline',
        status: 'ACTIVE'
      });
      setWorkflows(prev => [newWf, ...prev]);
      setEditingWorkflowId(newWf.id);
      addToast(`Created workflow "${newWf.name}"`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      const { execution } = await api.runWorkflow(id);
      addToast(`Execution enqueued: ${execution.id}`, 'info');
      // Update executions immediately
      setExecutions(prev => [execution, ...prev]);
      // If user wants to inspect run, open Runs tab
      setSelectedRunId(execution.id);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleTestWorkflow = async (id: string): Promise<ExecutionRecord> => {
    const { execution } = await api.testWorkflow(id);
    addToast(`Test run completed with status ${execution.status}`, execution.status === 'SUCCESS' ? 'success' : 'error');
    setExecutions(prev => [execution, ...prev]);
    return execution;
  };

  const handleSaveWorkflow = async (updated: Workflow) => {
    try {
      const saved = await api.updateWorkflow(updated.id, updated);
      setWorkflows(prev => prev.map(w => w.id === saved.id ? saved : w));
      addToast(`Saved workflow v${saved.version}`, 'success');
      setEditingWorkflowId(null);
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handlePauseWorkflow = async (id: string) => {
    try {
      const paused = await api.pauseWorkflow(id);
      setWorkflows(prev => prev.map(w => w.id === paused.id ? paused : w));
      addToast('Workflow paused', 'info');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleResumeWorkflow = async (id: string) => {
    try {
      const resumed = await api.resumeWorkflow(id);
      setWorkflows(prev => prev.map(w => w.id === resumed.id ? resumed : w));
      addToast('Workflow activated', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDuplicateWorkflow = async (id: string) => {
    try {
      const clone = await api.duplicateWorkflow(id);
      setWorkflows(prev => [clone, ...prev]);
      addToast(`Duplicated as "${clone.name}"`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    try {
      await api.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      addToast('Workflow deleted', 'info');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleRetryRun = async (id: string) => {
    try {
      const { execution } = await api.retryExecution(id);
      addToast(`Execution ${id} re-enqueued for retry`, 'info');
      setExecutions(prev => prev.map(e => e.id === execution.id ? execution : e));
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelRun = async (id: string) => {
    try {
      const { execution } = await api.cancelExecution(id);
      addToast(`Execution ${id} cancelled`, 'info');
      setExecutions(prev => prev.map(e => e.id === execution.id ? execution : e));
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleCreateConnection = async (conn: Partial<Connection>) => {
    try {
      const created = await api.createConnection(conn);
      setConnections(prev => [...prev, created]);
      addToast(`Added connection "${created.name}"`, 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      await api.deleteConnection(id);
      setConnections(prev => prev.filter(c => c.id !== id));
      addToast('Connection deleted', 'info');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const editingWorkflow = workflows.find(w => w.id === editingWorkflowId) || null;

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Header */}
      <Header
        metrics={metrics}
        isConnected={isConnected}
        onNewWorkflow={handleNewWorkflow}
      />

      {/* Main Navigation (Tabs for Desktop, Bottom Glass Bar for Mobile) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setEditingWorkflowId(null);
          setCurrentTab(tab);
        }}
        runsBadge={metrics?.runningJobs || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
        
        {/* Full-Screen Visual Workflow Editor (when a workflow is opened) */}
        {editingWorkflow ? (
          <WorkflowEditor
            workflow={editingWorkflow}
            onSave={handleSaveWorkflow}
            onBack={() => setEditingWorkflowId(null)}
            onRunNow={handleRunNow}
            onTestWorkflow={handleTestWorkflow}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                metrics={metrics}
                workflows={workflows}
                onSelectWorkflow={(id) => setEditingWorkflowId(id)}
                onSelectRun={(id) => {
                  setSelectedRunId(id);
                  setCurrentTab('runs');
                }}
                onNewWorkflow={handleNewWorkflow}
                onQuickRun={handleRunNow}
              />
            )}

            {currentTab === 'automations' && (
              <AutomationsView
                workflows={workflows}
                onSelectWorkflow={(id) => setEditingWorkflowId(id)}
                onNewWorkflow={handleNewWorkflow}
                onRunNow={handleRunNow}
                onPause={handlePauseWorkflow}
                onResume={handleResumeWorkflow}
                onDuplicate={handleDuplicateWorkflow}
                onDelete={handleDeleteWorkflow}
              />
            )}

            {currentTab === 'runs' && (
              <RunsView
                executions={executions}
                selectedRunId={selectedRunId}
                onSelectRun={setSelectedRunId}
                onRetry={handleRetryRun}
                onCancel={handleCancelRun}
                onRefresh={loadAllData}
              />
            )}

            {currentTab === 'webhooks' && (
              <WebhooksView
                workflows={workflows}
                onSelectRun={(id) => {
                  setSelectedRunId(id);
                  setCurrentTab('runs');
                }}
              />
            )}

            {currentTab === 'connections' && (
              <ConnectionsView
                connections={connections}
                onCreateConnection={handleCreateConnection}
                onDeleteConnection={handleDeleteConnection}
              />
            )}

            {currentTab === 'audit' && (
              <AuditView
                logs={auditLogs}
                onRefresh={loadAllData}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                onTemplateInstantiated={loadAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                : toast.type === 'info'
                ? 'bg-blue-950/90 border-blue-500/40 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                : 'bg-slate-900/90 border-cyan-500/40 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

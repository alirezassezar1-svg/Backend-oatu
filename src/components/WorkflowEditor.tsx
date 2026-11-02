/**
 * NONONICK AUTOMATION ENGINE
 * Touch-Friendly Visual Workflow Builder & Test Console
 */

import React, { useState } from 'react';
import { 
  Play, 
  Sparkles, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Copy, 
  Settings, 
  Check, 
  AlertCircle, 
  Clock, 
  GitBranch, 
  Terminal, 
  Database, 
  Mail, 
  Globe, 
  Power, 
  Eye, 
  Save, 
  Share2, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  ArrowDown
} from 'lucide-react';
import { 
  Workflow, 
  WorkflowNode, 
  NodeType, 
  ActionType, 
  TriggerType, 
  ConditionOperator, 
  ConditionDataType,
  ExecutionRecord
} from '../types/index.js';

interface WorkflowEditorProps {
  workflow: Workflow;
  onSave: (updated: Workflow) => void;
  onBack: () => void;
  onRunNow: (id: string) => void;
  onTestWorkflow: (id: string) => Promise<ExecutionRecord>;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflow: initialWorkflow,
  onSave,
  onBack,
  onRunNow,
  onTestWorkflow
}) => {
  const [workflow, setWorkflow] = useState<Workflow>(JSON.parse(JSON.stringify(initialWorkflow)));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(workflow.nodes[0]?.id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ExecutionRecord | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'test_output'>('canvas');

  const selectedNode = workflow.nodes.find(n => n.id === selectedNodeId) || null;

  // Node editing handlers
  const handleUpdateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n)
    }));
  };

  const handleAddNode = (type: NodeType, actionType?: ActionType) => {
    const newNodeId = `node_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    let name = 'New Node';
    let actionConfig: any = undefined;
    let conditionConfig: any = undefined;
    let triggerConfig: any = undefined;

    if (type === 'trigger') {
      name = 'Trigger Event';
      triggerConfig = { type: 'manual', description: 'Manual invocation' };
    } else if (type === 'condition') {
      name = 'Filter Rule';
      conditionConfig = {
        logicalOperator: 'AND',
        rules: [
          { id: `r_${Date.now()}`, field: 'trigger.body.budget', operator: 'greater_than', dataType: 'number', value: 1000 }
        ]
      };
    } else if (type === 'action') {
      const act = actionType || 'create_log';
      if (act === 'http_request') {
        name = 'HTTP Request';
        actionConfig = { type: 'http_request', httpRequest: { url: 'https://httpbin.org/get', method: 'GET', timeoutSeconds: 30 } };
      } else if (act === 'database_insert') {
        name = 'DB: Insert Record';
        actionConfig = { type: 'database_insert', database: { operation: 'INSERT', collection: 'records', data: { createdAt: '{{date.now}}' } } };
      } else if (act === 'send_email') {
        name = 'Email Alert';
        actionConfig = { type: 'send_email', email: { to: 'ops@company.com', subject: 'Automated Alert', body: 'Alert from workflow {{workflow.name}}' } };
      } else if (act === 'send_webhook') {
        name = 'Send Webhook';
        actionConfig = { type: 'send_webhook', webhookSend: { url: 'https://httpbin.org/post', payload: '{"event":"triggered"}' } };
      } else if (act === 'create_task') {
        name = 'Create Task';
        actionConfig = { type: 'create_task', task: { title: 'Review automation result', priority: 'medium' } };
      } else {
        name = 'Create Log';
        actionConfig = { type: 'create_log', logMessage: 'Step executed at {{date.now}}' };
      }
    } else if (type === 'delay') {
      name = 'Delay Timer';
      actionConfig = { type: 'delay', delay: { seconds: 5 } };
    } else if (type === 'end') {
      name = 'End of Pipeline';
    }

    const newNode: WorkflowNode = {
      id: newNodeId,
      type,
      name,
      enabled: true,
      actionConfig,
      conditionConfig,
      triggerConfig,
      position: { x: 100, y: 100 + workflow.nodes.length * 120 }
    };

    // Auto connect to previous node if available
    const newEdges = [...workflow.edges];
    if (workflow.nodes.length > 0) {
      const lastNode = workflow.nodes[workflow.nodes.length - 1];
      newEdges.push({
        id: `e_${Date.now()}`,
        source: lastNode.id,
        target: newNodeId
      });
    }

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      edges: newEdges
    }));

    setSelectedNodeId(newNodeId);
    setShowPalette(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(workflow.nodes[0]?.id || null);
    }
  };

  const handleDuplicateNode = (node: WorkflowNode) => {
    const dupId = `node_${Date.now()}_dup`;
    const dupNode: WorkflowNode = {
      ...JSON.parse(JSON.stringify(node)),
      id: dupId,
      name: `${node.name} (Copy)`
    };
    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, dupNode]
    }));
    setSelectedNodeId(dupId);
  };

  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    try {
      await onSave(workflow);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteTest = async () => {
    setIsTesting(true);
    setActiveTab('test_output');
    try {
      const result = await onTestWorkflow(workflow.id);
      setTestResult(result);
    } catch (err: any) {
      console.error('Test execution failed:', err);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] pb-16 md:pb-0 bg-[#07090e] -mx-4 -my-4 sm:-mx-6 sm:-my-6">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0e17] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workflow.name}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                className="font-bold text-sm sm:text-base text-white bg-transparent border-b border-transparent hover:border-cyan-500/50 focus:border-cyan-400 focus:outline-none px-1"
              />
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                v{workflow.version}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 px-1 font-mono">
              Status: <span className="text-cyan-400">{workflow.status}</span> • {workflow.nodes.length} nodes
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Test Workflow (Section 23) */}
          <button
            onClick={handleExecuteTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isTesting ? 'Testing...' : 'Test Run'}</span>
          </button>

          {/* Run Now (Section 22) */}
          <button
            onClick={() => onRunNow(workflow.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-cyan-400" />
            <span className="hidden sm:inline">Run Now</span>
          </button>

          {/* Save / Publish */}
          <button
            onClick={handleSaveWorkflow}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas + Inspector Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left: Interactive Canvas Flow */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 cyber-grid relative">
          
          {/* Switch tabs between Canvas & Test Output */}
          <div className="flex items-center gap-2 mb-4 bg-slate-900/80 p-1 rounded-xl border border-white/[0.08] w-fit">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                activeTab === 'canvas' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
              }`}
            >
              Pipeline Nodes ({workflow.nodes.length})
            </button>
            <button
              onClick={() => setActiveTab('test_output')}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center gap-1 ${
                activeTab === 'test_output' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-400'
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Live Test Inspector</span>
              {testResult && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>
          </div>

          {activeTab === 'canvas' ? (
            <div className="flex flex-col items-center max-w-md mx-auto w-full space-y-3 pb-24">
              {workflow.nodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                return (
                  <React.Fragment key={node.id}>
                    {/* Node Card */}
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`w-full rounded-2xl p-4 transition-all cursor-pointer relative ${
                        isSelected
                          ? 'glass-panel-elevated ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.2)]'
                          : 'glass-panel hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${
                            node.type === 'trigger' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                            node.type === 'condition' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            node.type === 'action' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                            'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {node.type === 'trigger' && <Power className="w-4 h-4" />}
                            {node.type === 'condition' && <GitBranch className="w-4 h-4" />}
                            {node.type === 'action' && <Terminal className="w-4 h-4" />}
                            {node.type === 'delay' && <Clock className="w-4 h-4" />}
                            {node.type === 'end' && <Check className="w-4 h-4" />}
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                              {node.type}
                            </span>
                            <h4 className="text-sm font-bold text-white leading-tight">
                              {node.name}
                            </h4>
                          </div>
                        </div>

                        {/* Node status toggle & quick actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateNode(node.id, { enabled: !node.enabled });
                            }}
                            title={node.enabled ? 'Enabled' : 'Disabled'}
                            className={`p-1.5 rounded-lg text-xs cursor-pointer ${
                              node.enabled ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateNode(node);
                            }}
                            title="Duplicate Node"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {workflow.nodes.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNode(node.id);
                              }}
                              title="Delete Node"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Brief config snippet */}
                      <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg font-mono truncate">
                        {node.type === 'trigger' && `Trigger: ${node.triggerConfig?.type || 'manual'}`}
                        {node.type === 'condition' && `Filter: ${node.conditionConfig?.rules.length || 0} rule(s)`}
                        {node.type === 'action' && `Action: ${node.actionConfig?.type || 'none'}`}
                        {node.type === 'delay' && `Delay: ${node.actionConfig?.delay?.seconds || 5}s`}
                      </div>
                    </div>

                    {/* Arrow down connector */}
                    {index < workflow.nodes.length - 1 && (
                      <div className="flex flex-col items-center my-0.5">
                        <div className="w-0.5 h-4 bg-gradient-to-b from-cyan-500/50 to-blue-500/50" />
                        <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Add Node Trigger */}
              <button
                onClick={() => setShowPalette(true)}
                className="w-full py-3 border-2 border-dashed border-white/[0.12] hover:border-cyan-500/40 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-slate-300 hover:text-cyan-300 bg-slate-900/40 hover:bg-cyan-500/5 transition-all cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Pipeline Step</span>
              </button>
            </div>
          ) : (
            /* Test Inspector Panel (Section 23) */
            <div className="max-w-2xl mx-auto w-full space-y-4">
              <div className="glass-panel p-4 rounded-2xl border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Deterministic Test Engine</h3>
                  </div>
                  <button
                    onClick={handleExecuteTest}
                    disabled={isTesting}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {isTesting ? 'Running Test...' : 'Run Test Now'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Executes workflow with sample payload, evaluates all conditions and actions, and displays exact step durations and inputs/outputs.
                </p>
              </div>

              {testResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono bg-slate-900/80 p-3 rounded-xl border border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      {testResult.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span className="font-bold text-white">Status: {testResult.status}</span>
                    </div>
                    <span className="text-slate-400">Total Duration: {testResult.duration_ms}ms</span>
                  </div>

                  {/* Step by step timeline */}
                  <div className="space-y-2">
                    {testResult.steps.map((st, i) => (
                      <div key={st.id} className="glass-panel p-3.5 rounded-xl border border-white/[0.06]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-cyan-400 font-bold">#{i + 1}</span>
                            <span className="text-xs font-bold text-white">{st.node_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                              {st.action}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{st.duration_ms}ms</span>
                        </div>

                        {st.error && (
                          <div className="mt-2 text-xs text-rose-300 bg-rose-950/60 p-2 rounded border border-rose-500/30">
                            {st.error}
                          </div>
                        )}

                        {st.output && (
                          <div className="mt-2 text-[11px] font-mono bg-[#05070b] p-2.5 rounded-lg text-slate-300 overflow-x-auto border border-white/[0.04]">
                            <span className="text-[10px] text-slate-400 block mb-1 uppercase font-semibold">Step Output:</span>
                            <pre>{JSON.stringify(st.output, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-8 text-center text-slate-400 rounded-2xl">
                  <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">No test run executed yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click "Run Test Now" to inspect live deterministic results.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Selected Node Configuration Inspector */}
        {selectedNode && (
          <div className="w-full md:w-80 lg:w-96 bg-[#0a0e17] border-t md:border-t-0 md:border-l border-white/[0.08] p-4 overflow-y-auto shrink-0 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Node Settings</h3>
              </div>
              <span className="text-[10px] font-mono uppercase bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                {selectedNode.type}
              </span>
            </div>

            {/* Name */}
            <div>
              <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                Step Name
              </label>
              <input
                type="text"
                value={selectedNode.name}
                onChange={(e) => handleUpdateNode(selectedNode.id, { name: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Config depending on Node Type */}
            {selectedNode.type === 'trigger' && (
              <div className="space-y-3">
                <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                  Trigger Mechanism
                </label>
                <select
                  value={selectedNode.triggerConfig?.type || 'manual'}
                  onChange={(e) => {
                    const newType = e.target.value as TriggerType;
                    const trigConf: any = { type: newType };
                    if (newType === 'webhook') {
                      trigConf.webhook = { token: `token_${Math.random().toString(36).substring(2, 8)}`, allowedMethods: ['POST'], format: 'json' };
                    } else if (newType === 'schedule') {
                      trigConf.schedule = { frequency: 'daily', timezone: 'UTC' };
                    }
                    handleUpdateNode(selectedNode.id, { triggerConfig: trigConf });
                    setWorkflow(prev => ({ ...prev, trigger: trigConf }));
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="manual">Manual Trigger</option>
                  <option value="schedule">Schedule Trigger</option>
                  <option value="webhook">Webhook Trigger</option>
                  <option value="form_submission">Form Submission Trigger</option>
                  <option value="database_event">Database Event Trigger</option>
                  <option value="file_upload">File Upload Trigger</option>
                  <option value="http_event">HTTP Event Trigger</option>
                </select>

                {selectedNode.triggerConfig?.type === 'webhook' && (
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-white/[0.06] text-xs space-y-2">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">Webhook Security Token</span>
                    <input
                      type="text"
                      value={selectedNode.triggerConfig.webhook?.token || ''}
                      onChange={(e) => {
                        const token = e.target.value;
                        const trig = {
                          ...selectedNode.triggerConfig!,
                          webhook: { ...selectedNode.triggerConfig!.webhook!, token }
                        };
                        handleUpdateNode(selectedNode.id, { triggerConfig: trig });
                        setWorkflow(prev => ({ ...prev, trigger: trig }));
                      }}
                      className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded text-xs font-mono text-white"
                    />
                  </div>
                )}

                {selectedNode.triggerConfig?.type === 'schedule' && (
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-white/[0.06] text-xs space-y-2">
                    <span className="text-[10px] text-purple-400 font-mono font-bold">Frequency</span>
                    <select
                      value={selectedNode.triggerConfig.schedule?.frequency || 'daily'}
                      onChange={(e) => {
                        const trig = {
                          ...selectedNode.triggerConfig!,
                          schedule: { ...selectedNode.triggerConfig!.schedule!, frequency: e.target.value as any }
                        };
                        handleUpdateNode(selectedNode.id, { triggerConfig: trig });
                        setWorkflow(prev => ({ ...prev, trigger: trig }));
                      }}
                      className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded text-xs text-white"
                    >
                      <option value="hourly">Every Hour</option>
                      <option value="daily">Every Day</option>
                      <option value="weekly">Every Week</option>
                      <option value="monthly">Every Month</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Condition Node Inspector (Section 9) */}
            {selectedNode.type === 'condition' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                    Rule Logic Group
                  </label>
                  <select
                    value={selectedNode.conditionConfig?.logicalOperator || 'AND'}
                    onChange={(e) => {
                      const group = {
                        ...selectedNode.conditionConfig!,
                        logicalOperator: e.target.value as any
                      };
                      handleUpdateNode(selectedNode.id, { conditionConfig: group });
                    }}
                    className="px-2 py-0.5 bg-slate-900 border border-white/[0.08] rounded text-xs font-mono text-cyan-300"
                  >
                    <option value="AND">AND (All match)</option>
                    <option value="OR">OR (Any match)</option>
                  </select>
                </div>

                {/* Rules List */}
                <div className="space-y-2">
                  {selectedNode.conditionConfig?.rules.map((rule, rIdx) => (
                    <div key={rule.id} className="bg-slate-900/80 p-2.5 rounded-xl border border-white/[0.06] space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400">Context Field</span>
                        <input
                          type="text"
                          value={rule.field}
                          onChange={(e) => {
                            const newRules = [...selectedNode.conditionConfig!.rules];
                            newRules[rIdx].field = e.target.value;
                            handleUpdateNode(selectedNode.id, {
                              conditionConfig: { ...selectedNode.conditionConfig!, rules: newRules }
                            });
                          }}
                          className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                          placeholder="trigger.body.budget"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400">Operator</span>
                          <select
                            value={rule.operator}
                            onChange={(e) => {
                              const newRules = [...selectedNode.conditionConfig!.rules];
                              newRules[rIdx].operator = e.target.value as any;
                              handleUpdateNode(selectedNode.id, {
                                conditionConfig: { ...selectedNode.conditionConfig!, rules: newRules }
                              });
                            }}
                            className="w-full px-1.5 py-1 bg-black/60 border border-white/[0.08] rounded text-[11px] text-white font-mono"
                          >
                            <option value="equals">equals</option>
                            <option value="not_equals">not_equals</option>
                            <option value="contains">contains</option>
                            <option value="greater_than">greater_than</option>
                            <option value="less_than">less_than</option>
                            <option value="greater_or_equal">greater_or_equal</option>
                            <option value="less_or_equal">less_or_equal</option>
                            <option value="is_empty">is_empty</option>
                            <option value="is_not_empty">is_not_empty</option>
                            <option value="matches">matches (regex)</option>
                          </select>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400">Data Type</span>
                          <select
                            value={rule.dataType}
                            onChange={(e) => {
                              const newRules = [...selectedNode.conditionConfig!.rules];
                              newRules[rIdx].dataType = e.target.value as any;
                              handleUpdateNode(selectedNode.id, {
                                conditionConfig: { ...selectedNode.conditionConfig!, rules: newRules }
                              });
                            }}
                            className="w-full px-1.5 py-1 bg-black/60 border border-white/[0.08] rounded text-[11px] text-white font-mono"
                          >
                            <option value="string">string</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="date">date</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400">Expected Value</span>
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => {
                            const newRules = [...selectedNode.conditionConfig!.rules];
                            newRules[rIdx].value = e.target.value;
                            handleUpdateNode(selectedNode.id, {
                              conditionConfig: { ...selectedNode.conditionConfig!, rules: newRules }
                            });
                          }}
                          className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                          placeholder="5000"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Node Inspector */}
            {selectedNode.type === 'action' && selectedNode.actionConfig && (
              <div className="space-y-3">
                <label className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                  Action Type
                </label>
                <select
                  value={selectedNode.actionConfig.type}
                  onChange={(e) => {
                    const actType = e.target.value as ActionType;
                    let actConf: any = { type: actType };
                    if (actType === 'http_request') {
                      actConf.httpRequest = { url: 'https://httpbin.org/get', method: 'GET', timeoutSeconds: 30 };
                    } else if (actType === 'database_insert') {
                      actConf.database = { operation: 'INSERT', collection: 'leads', data: { email: '{{trigger.body.email}}' } };
                    } else if (actType === 'send_email') {
                      actConf.email = { to: 'sales@internal.org', subject: 'Automated Notification', body: 'Execution ID: {{execution.id}}' };
                    } else if (actType === 'create_log') {
                      actConf.logMessage = 'Logged at {{date.now}}';
                    }
                    handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="http_request">HTTP Request</option>
                  <option value="database_insert">Database Insert</option>
                  <option value="database_update">Database Update</option>
                  <option value="database_query">Database Query</option>
                  <option value="send_email">Send Email</option>
                  <option value="send_webhook">Send Webhook</option>
                  <option value="create_task">Create Task</option>
                  <option value="create_log">Create Log</option>
                  <option value="delay">Delay Timer</option>
                  <option value="stop_workflow">Stop Workflow</option>
                </select>

                {/* HTTP Request Parameters */}
                {selectedNode.actionConfig.type === 'http_request' && selectedNode.actionConfig.httpRequest && (
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Target URL</span>
                      <input
                        type="text"
                        value={selectedNode.actionConfig.httpRequest.url}
                        onChange={(e) => {
                          const actConf = { ...selectedNode.actionConfig! };
                          actConf.httpRequest!.url = e.target.value;
                          handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                        }}
                        className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400">Method</span>
                        <select
                          value={selectedNode.actionConfig.httpRequest.method}
                          onChange={(e) => {
                            const actConf = { ...selectedNode.actionConfig! };
                            actConf.httpRequest!.method = e.target.value as any;
                            handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                          }}
                          className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400">Timeout (s)</span>
                        <input
                          type="number"
                          value={selectedNode.actionConfig.httpRequest.timeoutSeconds || 30}
                          onChange={(e) => {
                            const actConf = { ...selectedNode.actionConfig! };
                            actConf.httpRequest!.timeoutSeconds = parseInt(e.target.value, 10);
                            handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                          }}
                          className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                        />
                      </div>
                    </div>

                    {selectedNode.actionConfig.httpRequest.method !== 'GET' && (
                      <div>
                        <span className="text-[10px] text-slate-400">JSON Request Body</span>
                        <textarea
                          rows={3}
                          value={selectedNode.actionConfig.httpRequest.body || ''}
                          onChange={(e) => {
                            const actConf = { ...selectedNode.actionConfig! };
                            actConf.httpRequest!.body = e.target.value;
                            handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                          }}
                          placeholder='{"email": "{{trigger.body.email}}"}'
                          className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Email Parameters */}
                {selectedNode.actionConfig.type === 'send_email' && selectedNode.actionConfig.email && (
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Recipient (To)</span>
                      <input
                        type="text"
                        value={selectedNode.actionConfig.email.to}
                        onChange={(e) => {
                          const actConf = { ...selectedNode.actionConfig! };
                          actConf.email!.to = e.target.value;
                          handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                        }}
                        className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Subject</span>
                      <input
                        type="text"
                        value={selectedNode.actionConfig.email.subject}
                        onChange={(e) => {
                          const actConf = { ...selectedNode.actionConfig! };
                          actConf.email!.subject = e.target.value;
                          handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                        }}
                        className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded text-[11px] text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Body</span>
                      <textarea
                        rows={3}
                        value={selectedNode.actionConfig.email.body}
                        onChange={(e) => {
                          const actConf = { ...selectedNode.actionConfig! };
                          actConf.email!.body = e.target.value;
                          handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                        }}
                        className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Database Parameters */}
                {selectedNode.actionConfig.type.startsWith('database_') && selectedNode.actionConfig.database && (
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Collection Name</span>
                      <input
                        type="text"
                        value={selectedNode.actionConfig.database.collection}
                        onChange={(e) => {
                          const actConf = { ...selectedNode.actionConfig! };
                          actConf.database!.collection = e.target.value;
                          handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                        }}
                        className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Log message */}
                {selectedNode.actionConfig.type === 'create_log' && (
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-400">Log Message</span>
                    <textarea
                      rows={2}
                      value={selectedNode.actionConfig.logMessage || ''}
                      onChange={(e) => {
                        const actConf = { ...selectedNode.actionConfig!, logMessage: e.target.value };
                        handleUpdateNode(selectedNode.id, { actionConfig: actConf });
                      }}
                      className="w-full px-2 py-1 bg-black/60 border border-white/[0.08] rounded font-mono text-[11px] text-white"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node Selection Palette Modal */}
      {showPalette && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0e17] border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_35px_rgba(6,182,212,0.15)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Select Node Type</h3>
              <button
                onClick={() => setShowPalette(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleAddNode('condition')}
                className="p-3 bg-slate-900/80 hover:bg-amber-950/40 border border-white/[0.08] hover:border-amber-500/40 rounded-xl text-left transition-all cursor-pointer"
              >
                <GitBranch className="w-5 h-5 text-amber-400 mb-1" />
                <div className="text-xs font-bold text-white">Condition / Filter</div>
                <div className="text-[10px] text-slate-400">Evaluate rules (AND/OR)</div>
              </button>

              <button
                onClick={() => handleAddNode('action', 'http_request')}
                className="p-3 bg-slate-900/80 hover:bg-cyan-950/40 border border-white/[0.08] hover:border-cyan-500/40 rounded-xl text-left transition-all cursor-pointer"
              >
                <Globe className="w-5 h-5 text-cyan-400 mb-1" />
                <div className="text-xs font-bold text-white">HTTP Request</div>
                <div className="text-[10px] text-slate-400">GET/POST API call</div>
              </button>

              <button
                onClick={() => handleAddNode('action', 'database_insert')}
                className="p-3 bg-slate-900/80 hover:bg-blue-950/40 border border-white/[0.08] hover:border-blue-500/40 rounded-xl text-left transition-all cursor-pointer"
              >
                <Database className="w-5 h-5 text-blue-400 mb-1" />
                <div className="text-xs font-bold text-white">Database Action</div>
                <div className="text-[10px] text-slate-400">Insert/Update collections</div>
              </button>

              <button
                onClick={() => handleAddNode('action', 'send_email')}
                className="p-3 bg-slate-900/80 hover:bg-purple-950/40 border border-white/[0.08] hover:border-purple-500/40 rounded-xl text-left transition-all cursor-pointer"
              >
                <Mail className="w-5 h-5 text-purple-400 mb-1" />
                <div className="text-xs font-bold text-white">Send Email</div>
                <div className="text-[10px] text-slate-400">Notification mailer</div>
              </button>

              <button
                onClick={() => handleAddNode('action', 'create_log')}
                className="p-3 bg-slate-900/80 hover:bg-emerald-950/40 border border-white/[0.08] hover:border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer"
              >
                <Terminal className="w-5 h-5 text-emerald-400 mb-1" />
                <div className="text-xs font-bold text-white">Create Log</div>
                <div className="text-[10px] text-slate-400">Record milestone</div>
              </button>

              <button
                onClick={() => handleAddNode('delay')}
                className="p-3 bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] rounded-xl text-left transition-all cursor-pointer"
              >
                <Clock className="w-5 h-5 text-slate-400 mb-1" />
                <div className="text-xs font-bold text-white">Delay Timer</div>
                <div className="text-[10px] text-slate-400">Pause for N seconds</div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

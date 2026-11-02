/**
 * NONONICK AUTOMATION ENGINE
 * Interactive Webhook Management & Live Testing Console
 */

import React, { useState } from 'react';
import { 
  Webhook, 
  Copy, 
  Check, 
  Send, 
  Terminal, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  Code2, 
  AlertCircle 
} from 'lucide-react';
import { Workflow } from '../types/index.js';
import { api } from '../lib/api.js';

interface WebhooksViewProps {
  workflows: Workflow[];
  onSelectRun: (id: string) => void;
}

export const WebhooksView: React.FC<WebhooksViewProps> = ({
  workflows,
  onSelectRun
}) => {
  const webhookWorkflows = workflows.filter(w => w.trigger.type === 'webhook');
  const [selectedWfId, setSelectedWfId] = useState<string>(webhookWorkflows[0]?.id || '');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [payloadText, setPayloadText] = useState<string>(
    JSON.stringify({ name: 'Jordan Vance', email: 'jordan@vance.io', budget: 9500 }, null, 2)
  );
  const [httpMethod, setHttpMethod] = useState<'POST' | 'GET'>('POST');
  const [isFiring, setIsFiring] = useState(false);
  const [fireResult, setFireResult] = useState<any | null>(null);

  const currentWf = workflows.find(w => w.id === selectedWfId) || webhookWorkflows[0];
  const token = currentWf?.trigger.webhook?.token || 'default_sec_token';
  const endpointPath = currentWf ? `/api/webhooks/${currentWf.id}/${token}` : '';
  const fullEndpointUrl = typeof window !== 'undefined' ? `${window.location.origin}${endpointPath}` : endpointPath;

  const curlCommand = `curl -X ${httpMethod} "${fullEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${payloadText.replace(/'/g, "\\'")}'`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFireWebhook = async () => {
    if (!currentWf) return;
    setIsFiring(true);
    setFireResult(null);
    try {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(payloadText);
      } catch {
        parsedBody = { raw: payloadText };
      }

      const res = await api.triggerWebhook(currentWf.id, token, httpMethod, parsedBody);
      setFireResult(res);
    } catch (err: any) {
      setFireResult({ error: err.message || 'Webhook invocation failed' });
    } finally {
      setIsFiring(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Webhook Gateways</h1>
        <p className="text-xs text-slate-400">Unique deterministic endpoints with live token verification and instant queue ingest</p>
      </div>

      {webhookWorkflows.length === 0 ? (
        <div className="glass-panel p-10 text-center text-slate-400 rounded-2xl border border-white/[0.06]">
          <Webhook className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">No Webhook Workflows Configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Create or edit a workflow and set its trigger mechanism to "Webhook Trigger" to obtain unique endpoints.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Endpoint configuration & selector */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel p-4 rounded-2xl border border-white/[0.06] space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Select Webhook Workflow
              </label>
              <select
                value={currentWf?.id || ''}
                onChange={(e) => setSelectedWfId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {webhookWorkflows.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.id})
                  </option>
                ))}
              </select>

              {/* Endpoint URL Pill */}
              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                  Unique Secure Ingestion URL
                </span>
                <div className="flex items-center gap-2 bg-[#05070b] p-2.5 rounded-xl border border-white/[0.06]">
                  <span className="font-mono text-xs text-slate-200 truncate flex-1 select-all">
                    {fullEndpointUrl}
                  </span>
                  <button
                    onClick={() => copyToClipboard(fullEndpointUrl, 'url')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Security info */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-cyan-950/20 border border-cyan-500/20 p-2.5 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Protected by token: <code className="font-mono text-cyan-300">{token}</code></span>
              </div>
            </div>

            {/* Curl Snippet */}
            <div className="glass-panel p-4 rounded-2xl border border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span>cURL Integration Command</span>
                </span>
                <button
                  onClick={() => copyToClipboard(curlCommand, 'curl')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono"
                >
                  {copiedKey === 'curl' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy cURL</span>
                </button>
              </div>
              <pre className="bg-[#05070b] p-3 rounded-xl border border-white/[0.04] text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre">
                {curlCommand}
              </pre>
            </div>
          </div>

          {/* Right Column: Live Webhook Testing Console */}
          <div className="lg:col-span-6 space-y-4">
            <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Live Webhook Tester</h3>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as any)}
                    className="px-2 py-1 bg-slate-900 border border-white/[0.08] rounded-lg text-xs font-mono text-cyan-300"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
                </div>
              </div>

              {httpMethod === 'POST' && (
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block mb-1">
                    JSON Request Body Payload
                  </label>
                  <textarea
                    rows={6}
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    className="w-full p-2.5 bg-[#05070b] border border-white/[0.08] rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              <button
                onClick={handleFireWebhook}
                disabled={isFiring}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isFiring ? 'Dispatching Webhook...' : 'Fire Live Webhook'}</span>
              </button>

              {/* Instant Response Panel */}
              {fireResult && (
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 uppercase font-bold text-[10px]">Server Response</span>
                    {fireResult.success ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        HTTP 202 Accepted
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </div>

                  <pre className="bg-[#05070b] p-2.5 rounded-xl border border-white/[0.04] text-[11px] font-mono text-slate-300 overflow-x-auto">
                    {JSON.stringify(fireResult, null, 2)}
                  </pre>

                  {fireResult.executionId && (
                    <button
                      onClick={() => onSelectRun(fireResult.executionId)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono underline cursor-pointer"
                    >
                      View Live Run #{fireResult.executionId} →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

/**
 * NONONICK AUTOMATION ENGINE
 * Production Express Server & Automation API Entrypoint
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { db } from './server/db.js';
import { WorkflowEngine, registerExecutionListener } from './server/engine/workflowEngine.js';
import { ExecutionQueue } from './server/engine/queue.js';
import { Scheduler } from './server/engine/scheduler.js';
import { maskSensitiveData } from './server/engine/variables.js';
import { Workflow, AppFileRecord, AuditLogEntry } from './src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer storage for real file workflow handling
const uploadDir = path.resolve(__dirname, 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB max

// Server-Sent Events (SSE) clients for real-time live execution updates
interface SseClient {
  id: string;
  res: Response;
}
const sseClients: SseClient[] = [];

registerExecutionListener((execution) => {
  const payload = `data: ${JSON.stringify(execution)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  }
});

// SSE Stream Endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const client: SseClient = { id: clientId, res };
  sseClients.push(client);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex(c => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// ==========================================
// 1. WEBHOOKS ENDPOINT
// ==========================================
app.all('/api/webhooks/:workflowId/:token', upload.any(), (req: Request, res: Response) => {
  const { workflowId, token } = req.params;
  const workflow = db.getWorkflowById(workflowId);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  if (workflow.status !== 'ACTIVE') {
    return res.status(403).json({ error: `Workflow is currently ${workflow.status}` });
  }

  if (workflow.trigger.type !== 'webhook' || workflow.trigger.webhook?.token !== token) {
    return res.status(401).json({ error: 'Invalid webhook authentication token' });
  }

  const allowedMethods = workflow.trigger.webhook.allowedMethods || ['POST', 'GET'];
  if (!allowedMethods.includes(req.method as any)) {
    return res.status(405).json({ error: `Method ${req.method} not allowed for this webhook` });
  }

  // Construct incoming trigger context
  const webhookData = {
    headers: req.headers,
    method: req.method,
    body: req.body || {},
    query: req.query || {},
    files: (req.files as any[]) || [],
    ip: req.ip || req.socket.remoteAddress,
    timestamp: new Date().toISOString()
  };

  const execution = WorkflowEngine.createExecution(workflow, webhookData, { priority: 'high' });
  ExecutionQueue.enqueue(execution.id, workflow.id, execution.priority);

  // Audit log
  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user: 'webhook_caller',
    action: 'WEBHOOK_RECEIVED',
    resource: workflow.name,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    result: 'SUCCESS',
    details: `Webhook received for ${workflow.id}`
  });

  res.status(202).json({
    success: true,
    message: 'Webhook received and workflow queued for execution',
    executionId: execution.id,
    status: 'QUEUED'
  });
});

// ==========================================
// 2. WORKFLOWS API
// ==========================================
app.get('/api/workflows', (_req: Request, res: Response) => {
  res.json(db.getWorkflows());
});

app.get('/api/workflows/:id', (req: Request, res: Response) => {
  const wf = db.getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
});

app.post('/api/workflows', (req: Request, res: Response) => {
  const { name, description, trigger, conditions, nodes, edges, status } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Workflow name is required' });
  }

  const newWorkflow: Workflow = {
    id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    description: description || '',
    status: status || 'DRAFT',
    version: 1,
    trigger: trigger || { type: 'manual', description: 'Manual trigger' },
    conditions: conditions || { logicalOperator: 'AND', rules: [] },
    nodes: nodes || [
      {
        id: `node_${Date.now()}_trig`,
        type: 'trigger',
        name: 'Manual Trigger',
        enabled: true,
        triggerConfig: { type: 'manual' },
        position: { x: 100, y: 100 }
      }
    ],
    edges: edges || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    failure_count: 0,
    last_run_at: null
  };

  db.saveWorkflow(newWorkflow);

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user: 'admin',
    action: 'WORKFLOW_CREATED',
    resource: newWorkflow.name,
    timestamp: new Date().toISOString(),
    result: 'SUCCESS',
    details: `Created new workflow ${newWorkflow.id}`
  });

  res.status(201).json(newWorkflow);
});

app.put('/api/workflows/:id', (req: Request, res: Response) => {
  const existing = db.getWorkflowById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });

  const updates = req.body;
  const updatedWorkflow: Workflow = {
    ...existing,
    ...updates,
    id: existing.id, // preserve id
    version: existing.version + 1,
    updated_at: new Date().toISOString()
  };

  db.saveWorkflow(updatedWorkflow);

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user: 'admin',
    action: 'WORKFLOW_UPDATED',
    resource: updatedWorkflow.name,
    timestamp: new Date().toISOString(),
    result: 'SUCCESS',
    details: `Updated workflow to version ${updatedWorkflow.version}`
  });

  res.json(updatedWorkflow);
});

app.delete('/api/workflows/:id', (req: Request, res: Response) => {
  const existing = db.getWorkflowById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });

  db.deleteWorkflow(req.params.id);

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user: 'admin',
    action: 'WORKFLOW_DELETED',
    resource: existing.name,
    timestamp: new Date().toISOString(),
    result: 'SUCCESS',
    details: `Deleted workflow ${req.params.id}`
  });

  res.json({ success: true, message: 'Workflow deleted' });
});

app.post('/api/workflows/:id/pause', (req: Request, res: Response) => {
  const wf = db.getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  wf.status = 'PAUSED';
  wf.updated_at = new Date().toISOString();
  db.saveWorkflow(wf);

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user: 'admin',
    action: 'WORKFLOW_PAUSED',
    resource: wf.name,
    timestamp: new Date().toISOString(),
    result: 'SUCCESS'
  });

  res.json(wf);
});

app.post('/api/workflows/:id/resume', (req: Request, res: Response) => {
  const wf = db.getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  wf.status = 'ACTIVE';
  wf.updated_at = new Date().toISOString();
  db.saveWorkflow(wf);

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user: 'admin',
    action: 'WORKFLOW_RESUMED',
    resource: wf.name,
    timestamp: new Date().toISOString(),
    result: 'SUCCESS'
  });

  res.json(wf);
});

app.post('/api/workflows/:id/duplicate', (req: Request, res: Response) => {
  const existing = db.getWorkflowById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Workflow not found' });

  const clone: Workflow = {
    ...JSON.parse(JSON.stringify(existing)),
    id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `${existing.name} (Copy)`,
    status: 'DRAFT',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    failure_count: 0,
    last_run_at: null
  };

  db.saveWorkflow(clone);
  res.status(201).json(clone);
});

// Run Now (Section 22)
app.post('/api/workflows/:id/run', async (req: Request, res: Response) => {
  const wf = db.getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const inputPayload = req.body?.payload || {
    source: 'manual_run_button',
    user: 'operator',
    triggered_at: new Date().toISOString()
  };

  const execution = WorkflowEngine.createExecution(wf, inputPayload, { priority: 'high', isTest: false });
  ExecutionQueue.enqueue(execution.id, wf.id, execution.priority);

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user: 'admin',
    action: 'WORKFLOW_EXECUTED_MANUAL',
    resource: wf.name,
    timestamp: new Date().toISOString(),
    result: 'SUCCESS',
    details: `Enqueued manual run ${execution.id}`
  });

  res.status(200).json({
    success: true,
    executionId: execution.id,
    execution
  });
});

// Test Mode (Section 23)
app.post('/api/workflows/:id/test', async (req: Request, res: Response) => {
  const wf = db.getWorkflowById(req.params.id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });

  const inputPayload = req.body?.payload || {
    test: true,
    mode: 'TEST_RUN',
    sampleLead: { name: 'Alex Johnson', email: 'alex@example.com', budget: 7500 },
    timestamp: new Date().toISOString()
  };

  const execution = WorkflowEngine.createExecution(wf, inputPayload, { priority: 'high', isTest: true });
  // Execute immediately synchronously for instant interactive feedback in Test Mode
  const finishedExecution = await WorkflowEngine.runExecution(execution.id);

  res.status(200).json({
    success: true,
    isTest: true,
    execution: finishedExecution
  });
});

// ==========================================
// 3. EXECUTIONS & RUN HISTORY API
// ==========================================
app.get('/api/executions', (req: Request, res: Response) => {
  const { status, workflowId, limit } = req.query;
  let list = db.getExecutions(parseInt(String(limit || 100), 10));

  if (status && status !== 'all') {
    list = list.filter(e => e.status.toLowerCase() === String(status).toLowerCase());
  }

  if (workflowId) {
    list = list.filter(e => e.workflow_id === workflowId);
  }

  res.json(list);
});

app.get('/api/executions/:id', (req: Request, res: Response) => {
  const exec = db.getExecutionById(req.params.id);
  if (!exec) return res.status(404).json({ error: 'Execution record not found' });
  res.json(exec);
});

app.post('/api/executions/:id/retry', async (req: Request, res: Response) => {
  const exec = db.getExecutionById(req.params.id);
  if (!exec) return res.status(404).json({ error: 'Execution record not found' });

  exec.status = 'QUEUED';
  exec.attempt_number += 1;
  exec.next_retry_at = null;
  exec.error = null;
  db.saveExecution(exec);

  ExecutionQueue.enqueue(exec.id, exec.workflow_id, 'high');

  res.json({ success: true, execution: exec });
});

app.post('/api/executions/:id/cancel', (req: Request, res: Response) => {
  const exec = db.getExecutionById(req.params.id);
  if (!exec) return res.status(404).json({ error: 'Execution record not found' });

  if (exec.status === 'RUNNING' || exec.status === 'QUEUED' || exec.status === 'RETRYING') {
    exec.status = 'CANCELLED';
    exec.finished_at = new Date().toISOString();
    exec.error = 'Execution cancelled by operator';
    db.saveExecution(exec);
  }

  res.json({ success: true, execution: exec });
});

// ==========================================
// 4. REAL DASHBOARD METRICS API (Section 4 & 29)
// ==========================================
app.get('/api/metrics', (_req: Request, res: Response) => {
  const workflows = db.getWorkflows();
  const executions = db.getExecutions(500);

  const activeWorkflows = workflows.filter(w => w.status === 'ACTIVE').length;
  const pausedWorkflows = workflows.filter(w => w.status === 'PAUSED').length;
  const draftWorkflows = workflows.filter(w => w.status === 'DRAFT').length;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const executionsToday = executions.filter(e => new Date(e.created_at).getTime() >= todayMs);
  const successfulExecutions = executionsToday.filter(e => e.status === 'SUCCESS').length;
  const failedExecutions = executionsToday.filter(e => e.status === 'FAILED').length;

  const queueMetrics = ExecutionQueue.getMetrics();
  const runningJobs = queueMetrics.runningWorkers;
  const queuedJobs = queueMetrics.queueDepth;

  // Real average duration calculation
  const completedExecutions = executionsToday.filter(e => e.duration_ms > 0);
  const totalDuration = completedExecutions.reduce((sum, e) => sum + e.duration_ms, 0);
  const averageExecutionDurationMs = completedExecutions.length > 0 
    ? Math.round(totalDuration / completedExecutions.length) 
    : 0;

  const successRatePercentage = executionsToday.length > 0
    ? Math.round((successfulExecutions / executionsToday.length) * 100)
    : 100;

  const recentActivity = executions.slice(0, 10);
  const failedWorkflows = workflows.filter(w => w.failure_count > 0);

  res.json({
    activeWorkflows,
    pausedWorkflows,
    draftWorkflows,
    executionsToday: executionsToday.length,
    successfulExecutions,
    failedExecutions,
    runningJobs,
    queuedJobs,
    averageExecutionDurationMs,
    successRatePercentage,
    recentActivity,
    failedWorkflows
  });
});

// ==========================================
// 5. CONNECTIONS API (Section 26)
// ==========================================
app.get('/api/connections', (_req: Request, res: Response) => {
  const conns = db.getConnections();
  // Safe client masking
  const sanitized = conns.map(c => ({
    ...c,
    config: maskSensitiveData(c.config)
  }));
  res.json(sanitized);
});

app.post('/api/connections', (req: Request, res: Response) => {
  const { name, type, config } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });

  const newConn = {
    id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    type,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: config || {}
  };

  db.saveConnection(newConn);
  res.status(201).json(newConn);
});

app.delete('/api/connections/:id', (req: Request, res: Response) => {
  const ok = db.deleteConnection(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Connection not found' });
  res.json({ success: true });
});

// ==========================================
// 6. AUDIT LOGS API (Section 28)
// ==========================================
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// ==========================================
// 7. FILE HANDLING API (Section 33)
// ==========================================
app.get('/api/files', (_req: Request, res: Response) => {
  res.json(db.getFiles());
});

app.post('/api/files', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileRecord: AppFileRecord = {
    id: `file_${Date.now()}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploaded_at: new Date().toISOString(),
    path: req.file.path
  };

  db.addFile(fileRecord);

  // Trigger any workflows listening to file_upload
  const fileWorkflows = db.getWorkflows().filter(w => w.status === 'ACTIVE' && w.trigger.type === 'file_upload');
  for (const wf of fileWorkflows) {
    const exec = WorkflowEngine.createExecution(wf, { file: fileRecord });
    ExecutionQueue.enqueue(exec.id, wf.id, exec.priority);
  }

  res.status(201).json(fileRecord);
});

app.delete('/api/files/:id', (req: Request, res: Response) => {
  const ok = db.deleteFile(req.params.id);
  if (!ok) return res.status(404).json({ error: 'File not found' });
  res.json({ success: true });
});

// ==========================================
// 8. TEMPLATES API (Section 25)
// ==========================================
const WORKFLOW_TEMPLATES = [
  {
    id: 'tmpl_lead_pipeline',
    name: 'New Lead Qualification & CRM Ingestion',
    description: 'Intercepts lead requests, validates budget constraints, adds to CRM collection, and fires email notice.',
    category: 'Sales & Growth',
    nodesCount: 5
  },
  {
    id: 'tmpl_health_monitor',
    name: 'Continuous HTTP Endpoint Health Watcher',
    description: 'Periodic automated pings with latency logging and error detection.',
    category: 'DevOps & Reliability',
    nodesCount: 3
  },
  {
    id: 'tmpl_form_responder',
    name: 'Customer Contact Form Auto-Acknowledgement',
    description: 'Ingests website contact forms, generates an internal ticket task, and sends an automated reply.',
    category: 'Support & Operations',
    nodesCount: 3
  },
  {
    id: 'tmpl_webhook_relay',
    name: 'Secure Webhook Transformer & Forwarder',
    description: 'Accepts raw webhooks, extracts variables, and dispatches them to internal webhooks.',
    category: 'Integrations',
    nodesCount: 4
  }
];

app.get('/api/templates', (_req: Request, res: Response) => {
  res.json(WORKFLOW_TEMPLATES);
});

app.post('/api/templates/:id/instantiate', (req: Request, res: Response) => {
  const templateId = req.params.id;
  let newWf: Workflow | null = null;

  if (templateId === 'tmpl_lead_pipeline') {
    newWf = {
      id: `wf_${Date.now()}_lead`,
      name: 'Lead Pipeline ' + new Date().toLocaleDateString(),
      description: 'Production lead qualification and CRM intake pipeline',
      status: 'ACTIVE',
      version: 1,
      trigger: {
        type: 'webhook',
        webhook: {
          token: `token_${Math.random().toString(36).substring(2, 8)}`,
          allowedMethods: ['POST'],
          format: 'json'
        }
      },
      conditions: {
        logicalOperator: 'AND',
        rules: [
          { id: 'r1', field: 'trigger.body.budget', operator: 'greater_or_equal', dataType: 'number', value: 3000 }
        ]
      },
      nodes: [
        { id: 'n1', type: 'trigger', name: 'Webhook Ingestion', enabled: true, triggerConfig: { type: 'webhook' } },
        { id: 'n2', type: 'condition', name: 'Filter: Budget Check', enabled: true },
        { id: 'n3', type: 'action', name: 'DB: Insert Record', enabled: true, actionConfig: { type: 'database_insert', database: { operation: 'INSERT', collection: 'leads', data: { email: '{{trigger.body.email}}', name: '{{trigger.body.name}}' } } } },
        { id: 'n4', type: 'action', name: 'Email: Notify Sales', enabled: true, actionConfig: { type: 'send_email', email: { to: 'sales@internal.org', subject: 'Lead {{trigger.body.name}}', body: 'New lead incoming: {{trigger.body.email}}' } } }
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      execution_count: 0,
      success_count: 0,
      failure_count: 0,
      last_run_at: null
    };
  } else {
    newWf = {
      id: `wf_${Date.now()}_inst`,
      name: 'Custom Automated Pipeline ' + new Date().toLocaleDateString(),
      description: 'Instantiated from system template',
      status: 'ACTIVE',
      version: 1,
      trigger: { type: 'schedule', schedule: { frequency: 'daily', timezone: 'UTC' } },
      conditions: { logicalOperator: 'AND', rules: [] },
      nodes: [
        { id: 'n1', type: 'trigger', name: 'Daily Schedule', enabled: true, triggerConfig: { type: 'schedule' } },
        { id: 'n2', type: 'action', name: 'Health Ping', enabled: true, actionConfig: { type: 'http_request', httpRequest: { url: 'https://httpbin.org/get', method: 'GET' } } }
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      execution_count: 0,
      success_count: 0,
      failure_count: 0,
      last_run_at: null
    };
  }

  db.saveWorkflow(newWf);
  res.status(201).json(newWf);
});

// ==========================================
// 9. EXPORT & IMPORT (Section 35 & 36)
// ==========================================
app.get('/api/export', (_req: Request, res: Response) => {
  const full = db.exportData();
  // Never expose secrets during export
  const safeData = {
    ...full,
    connections: full.connections.map(c => ({
      ...c,
      config: maskSensitiveData(c.config)
    }))
  };
  res.setHeader('Content-Disposition', 'attachment; filename="nononick-backup.json"');
  res.json(safeData);
});

app.post('/api/import', (req: Request, res: Response) => {
  const { workflows } = req.body;
  if (!workflows || !Array.isArray(workflows)) {
    return res.status(400).json({ error: 'Invalid workflow package. Expected { workflows: [...] }' });
  }

  let importedCount = 0;
  for (const wf of workflows) {
    if (wf.name && wf.trigger && Array.isArray(wf.nodes)) {
      const sanitized: Workflow = {
        ...wf,
        id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        status: 'DRAFT', // Never auto-execute imported workflows
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        execution_count: 0,
        success_count: 0,
        failure_count: 0,
        last_run_at: null
      };
      db.saveWorkflow(sanitized);
      importedCount++;
    }
  }

  res.json({ success: true, importedCount });
});

// Generic Collections CRUD viewer
app.get('/api/collections/:name', (req: Request, res: Response) => {
  const items = db.queryCollection(req.params.name);
  res.json(items);
});

// Start scheduler & worker loops
ExecutionQueue.startWorkerLoop();
Scheduler.start();

// Mount Vite or serve static assets
async function bootstrapServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NONONICK ENGINE] Running on http://0.0.0.0:${PORT}`);
  });
}

bootstrapServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

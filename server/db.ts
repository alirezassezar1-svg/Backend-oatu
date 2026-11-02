/**
 * NONONICK AUTOMATION ENGINE
 * Persistent Database Layer with Atomic Writes & Abstract Query Engine
 */

import fs from 'fs';
import path from 'path';
import { 
  Workflow, 
  ExecutionRecord, 
  Connection, 
  AuditLogEntry, 
  AppFileRecord 
} from '../src/types/index.js';

export interface DatabaseSchema {
  workflows: Workflow[];
  executions: ExecutionRecord[];
  connections: Connection[];
  auditLogs: AuditLogEntry[];
  files: AppFileRecord[];
  tasks: Array<{ id: string; title: string; description?: string; assignee?: string; priority?: string; status: string; created_at: string }>;
  collections: Record<string, Array<{ id: string; [key: string]: any; created_at: string; updated_at: string }>>;
  settings: {
    workerConcurrency: number;
    defaultTimeoutSeconds: number;
    maxRetries: number;
    emailProvider: 'mock_deliverable' | 'smtp';
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const DB_TMP = path.join(DATA_DIR, 'db.tmp.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const INITIAL_WORKFLOWS: Workflow[] = [
  {
    id: 'wf_lead_qualifier',
    name: 'Lead Qualification & Webhook Router',
    description: 'Validates incoming webhook leads, filters high-budget inquiries (> $5,000), logs lead data, and triggers confirmation',
    status: 'ACTIVE',
    version: 1,
    trigger: {
      type: 'webhook',
      webhook: {
        token: 'lead_token_sec_99',
        allowedMethods: ['POST'],
        format: 'json'
      },
      description: 'Receives POST leads with email, name, and budget'
    },
    conditions: {
      logicalOperator: 'AND',
      rules: [
        {
          id: 'rule_budget',
          field: 'trigger.body.budget',
          operator: 'greater_or_equal',
          dataType: 'number',
          value: 5000
        },
        {
          id: 'rule_email',
          field: 'trigger.body.email',
          operator: 'is_not_empty',
          dataType: 'string',
          value: ''
        }
      ]
    },
    nodes: [
      {
        id: 'node_trigger',
        type: 'trigger',
        name: 'Webhook: Lead Submission',
        description: 'Endpoint: /api/webhooks/wf_lead_qualifier/lead_token_sec_99',
        enabled: true,
        triggerConfig: {
          type: 'webhook',
          webhook: {
            token: 'lead_token_sec_99',
            allowedMethods: ['POST'],
            format: 'json'
          }
        },
        position: { x: 100, y: 100 }
      },
      {
        id: 'node_condition',
        type: 'condition',
        name: 'Filter: Budget >= $5,000',
        description: 'Verify lead tier and email validity',
        enabled: true,
        conditionConfig: {
          logicalOperator: 'AND',
          rules: [
            {
              id: 'c1',
              field: 'trigger.body.budget',
              operator: 'greater_or_equal',
              dataType: 'number',
              value: 5000
            }
          ]
        },
        position: { x: 100, y: 220 }
      },
      {
        id: 'node_db_insert',
        type: 'action',
        name: 'Database: Store Lead',
        description: 'Insert lead into CRM leads collection',
        enabled: true,
        actionConfig: {
          type: 'database_insert',
          database: {
            operation: 'INSERT',
            collection: 'leads',
            data: {
              name: '{{trigger.body.name}}',
              email: '{{trigger.body.email}}',
              budget: '{{trigger.body.budget}}',
              status: 'QUALIFIED'
            }
          }
        },
        position: { x: 100, y: 340 }
      },
      {
        id: 'node_email',
        type: 'action',
        name: 'Email: Notify Sales Rep',
        description: 'Dispatches high-value lead notice to sales desk',
        enabled: true,
        actionConfig: {
          type: 'send_email',
          email: {
            to: 'sales@nononick.internal',
            subject: 'High Value Lead: {{trigger.body.name}} ($ {{trigger.body.budget}})',
            body: 'New qualified lead detected.\nName: {{trigger.body.name}}\nEmail: {{trigger.body.email}}\nBudget: {{trigger.body.budget}}\nExecution ID: {{execution.id}}',
            from: 'leads@nononick.engine'
          }
        },
        position: { x: 100, y: 460 }
      },
      {
        id: 'node_log',
        type: 'action',
        name: 'Log: Completion Audit',
        description: 'Record execution milestone',
        enabled: true,
        actionConfig: {
          type: 'create_log',
          logMessage: 'Lead {{trigger.body.email}} successfully routed and recorded at {{date.now}}'
        },
        position: { x: 100, y: 580 }
      }
    ],
    edges: [
      { id: 'e1', source: 'node_trigger', target: 'node_condition' },
      { id: 'e2', source: 'node_condition', target: 'node_db_insert' },
      { id: 'e3', source: 'node_db_insert', target: 'node_email' },
      { id: 'e4', source: 'node_email', target: 'node_log' }
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    failure_count: 0,
    last_run_at: null
  },
  {
    id: 'wf_health_monitor',
    name: 'Hourly Service Health Monitor',
    description: 'Pings external endpoints hourly, verifies 200 HTTP status, and logs response time',
    status: 'ACTIVE',
    version: 1,
    trigger: {
      type: 'schedule',
      schedule: {
        frequency: 'hourly',
        timezone: 'UTC',
        repeatInterval: 1
      },
      description: 'Executes every hour on the hour'
    },
    conditions: {
      logicalOperator: 'AND',
      rules: []
    },
    nodes: [
      {
        id: 'node_sch_trig',
        type: 'trigger',
        name: 'Schedule: Every 1 Hour',
        enabled: true,
        triggerConfig: {
          type: 'schedule',
          schedule: {
            frequency: 'hourly',
            timezone: 'UTC',
            repeatInterval: 1
          }
        },
        position: { x: 100, y: 100 }
      },
      {
        id: 'node_http_check',
        type: 'action',
        name: 'HTTP: Check API Status',
        description: 'Performs GET request to remote health endpoint',
        enabled: true,
        actionConfig: {
          type: 'http_request',
          httpRequest: {
            url: 'https://httpbin.org/status/200',
            method: 'GET',
            timeoutSeconds: 15
          }
        },
        position: { x: 100, y: 220 }
      },
      {
        id: 'node_health_log',
        type: 'action',
        name: 'Audit: Record Health Metric',
        enabled: true,
        actionConfig: {
          type: 'create_log',
          logMessage: 'Service health verified successfully at {{date.now}}. Execution: {{execution.id}}'
        },
        position: { x: 100, y: 340 }
      }
    ],
    edges: [
      { id: 'e_h1', source: 'node_sch_trig', target: 'node_http_check' },
      { id: 'e_h2', source: 'node_http_check', target: 'node_health_log' }
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    failure_count: 0,
    last_run_at: null
  },
  {
    id: 'wf_contact_form',
    name: 'Form Submission Auto-Responder',
    description: 'Handles website inquiries, stores contact ticket, and generates automated response task',
    status: 'ACTIVE',
    version: 1,
    trigger: {
      type: 'form_submission',
      formFields: [
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true },
        { name: 'message', type: 'string', required: true }
      ],
      description: 'Contact form ingestion'
    },
    conditions: {
      logicalOperator: 'AND',
      rules: [
        {
          id: 'rule_msg_len',
          field: 'trigger.body.message',
          operator: 'is_not_empty',
          dataType: 'string',
          value: ''
        }
      ]
    },
    nodes: [
      {
        id: 'n_form_trig',
        type: 'trigger',
        name: 'Form: Contact Request Ingest',
        enabled: true,
        triggerConfig: {
          type: 'form_submission'
        },
        position: { x: 100, y: 100 }
      },
      {
        id: 'n_task_create',
        type: 'action',
        name: 'Task: Create Support Ticket',
        enabled: true,
        actionConfig: {
          type: 'create_task',
          task: {
            title: 'Respond to {{trigger.body.name}} ({{trigger.body.email}})',
            description: 'Customer inquiry: {{trigger.body.message}}',
            priority: 'high',
            assignee: 'Support Team'
          }
        },
        position: { x: 100, y: 220 }
      },
      {
        id: 'n_email_ack',
        type: 'action',
        name: 'Email: Send Receipt Confirmation',
        enabled: true,
        actionConfig: {
          type: 'send_email',
          email: {
            to: '{{trigger.body.email}}',
            subject: 'We received your message, {{trigger.body.name}}',
            body: 'Hello {{trigger.body.name}},\n\nThank you for reaching out to us. We have received your message:\n"{{trigger.body.message}}"\n\nOur team is reviewing it and will respond promptly.',
            from: 'no-reply@nononick.automation'
          }
        },
        position: { x: 100, y: 340 }
      }
    ],
    edges: [
      { id: 'ef1', source: 'n_form_trig', target: 'n_task_create' },
      { id: 'ef2', source: 'n_task_create', target: 'n_email_ack' }
    ],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date().toISOString(),
    execution_count: 0,
    success_count: 0,
    failure_count: 0,
    last_run_at: null
  }
];

const INITIAL_CONNECTIONS: Connection[] = [
  {
    id: 'conn_http_default',
    name: 'Primary API Gateway',
    type: 'http',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      baseUrl: 'https://httpbin.org',
      authHeader: 'Bearer nono_live_key_production'
    }
  },
  {
    id: 'conn_email_smtp',
    name: 'Transactional Mailer Engine',
    type: 'email',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    config: {
      emailProvider: 'mock_deliverable',
      smtpHost: 'mail.internal.net',
      smtpPort: 587
    }
  }
];

class Database {
  private data: DatabaseSchema;
  private isSaving = false;
  private savePending = false;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          workflows: parsed.workflows || INITIAL_WORKFLOWS,
          executions: parsed.executions || [],
          connections: parsed.connections || INITIAL_CONNECTIONS,
          auditLogs: parsed.auditLogs || [],
          files: parsed.files || [],
          tasks: parsed.tasks || [],
          collections: parsed.collections || {
            leads: [],
            metrics: [],
            events: []
          },
          settings: parsed.settings || {
            workerConcurrency: 4,
            defaultTimeoutSeconds: 30,
            maxRetries: 3,
            emailProvider: 'mock_deliverable',
            smtpHost: 'mail.internal.net',
            smtpPort: 587,
            smtpUser: 'engine'
          }
        };
      } catch (err) {
        console.error('Failed to parse existing db.json, initializing fresh schema', err);
      }
    }

    const defaultData: DatabaseSchema = {
      workflows: INITIAL_WORKFLOWS,
      executions: [],
      connections: INITIAL_CONNECTIONS,
      auditLogs: [
        {
          id: 'log_boot',
          user: 'system',
          action: 'ENGINE_INITIALIZED',
          resource: 'NONONICK_CORE',
          timestamp: new Date().toISOString(),
          result: 'SUCCESS',
          details: 'Automation Engine database initialized with core templates.'
        }
      ],
      files: [],
      tasks: [],
      collections: {
        leads: [],
        metrics: [],
        events: []
      },
      settings: {
        workerConcurrency: 4,
        defaultTimeoutSeconds: 30,
        maxRetries: 3,
        emailProvider: 'mock_deliverable',
        smtpHost: 'mail.internal.net',
        smtpPort: 587,
        smtpUser: 'engine'
      }
    };

    this.atomicWrite(defaultData);
    return defaultData;
  }

  private atomicWrite(data: DatabaseSchema): void {
    try {
      const serialized = JSON.stringify(data, null, 2);
      fs.writeFileSync(DB_TMP, serialized, 'utf-8');
      fs.renameSync(DB_TMP, DB_FILE);
    } catch (err) {
      console.error('Error in atomicWrite:', err);
    }
  }

  public save(): void {
    if (this.isSaving) {
      this.savePending = true;
      return;
    }
    this.isSaving = true;
    try {
      this.atomicWrite(this.data);
    } finally {
      this.isSaving = false;
      if (this.savePending) {
        this.savePending = false;
        this.save();
      }
    }
  }

  // Workflows
  public getWorkflows(): Workflow[] {
    return this.data.workflows;
  }

  public getWorkflowById(id: string): Workflow | undefined {
    return this.data.workflows.find(w => w.id === id);
  }

  public saveWorkflow(workflow: Workflow): void {
    const idx = this.data.workflows.findIndex(w => w.id === workflow.id);
    if (idx >= 0) {
      this.data.workflows[idx] = workflow;
    } else {
      this.data.workflows.unshift(workflow);
    }
    this.save();
  }

  public deleteWorkflow(id: string): boolean {
    const prevLen = this.data.workflows.length;
    this.data.workflows = this.data.workflows.filter(w => w.id !== id);
    if (this.data.workflows.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Executions
  public getExecutions(limit = 100): ExecutionRecord[] {
    return this.data.executions.slice(0, limit);
  }

  public getExecutionById(id: string): ExecutionRecord | undefined {
    return this.data.executions.find(e => e.id === id);
  }

  public saveExecution(execution: ExecutionRecord): void {
    const idx = this.data.executions.findIndex(e => e.id === execution.id);
    if (idx >= 0) {
      this.data.executions[idx] = execution;
    } else {
      this.data.executions.unshift(execution);
      // Keep execution history bounded to last 1000 runs
      if (this.data.executions.length > 1000) {
        this.data.executions = this.data.executions.slice(0, 1000);
      }
    }
    this.save();
  }

  // Connections
  public getConnections(): Connection[] {
    return this.data.connections;
  }

  public getConnectionById(id: string): Connection | undefined {
    return this.data.connections.find(c => c.id === id);
  }

  public saveConnection(connection: Connection): void {
    const idx = this.data.connections.findIndex(c => c.id === connection.id);
    if (idx >= 0) {
      this.data.connections[idx] = connection;
    } else {
      this.data.connections.push(connection);
    }
    this.save();
  }

  public deleteConnection(id: string): boolean {
    const prev = this.data.connections.length;
    this.data.connections = this.data.connections.filter(c => c.id !== id);
    if (this.data.connections.length !== prev) {
      this.save();
      return true;
    }
    return false;
  }

  // Audit Logs
  public getAuditLogs(limit = 100): AuditLogEntry[] {
    return this.data.auditLogs.slice(0, limit);
  }

  public addAuditLog(entry: AuditLogEntry): void {
    this.data.auditLogs.unshift(entry);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.save();
  }

  // Files
  public getFiles(): AppFileRecord[] {
    return this.data.files;
  }

  public addFile(file: AppFileRecord): void {
    this.data.files.unshift(file);
    this.save();
  }

  public deleteFile(id: string): boolean {
    const file = this.data.files.find(f => f.id === id);
    if (file) {
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
      this.data.files = this.data.files.filter(f => f.id !== id);
      this.save();
      return true;
    }
    return false;
  }

  // Tasks
  public getTasks(): any[] {
    return this.data.tasks;
  }

  public addTask(task: any): void {
    this.data.tasks.unshift(task);
    this.save();
  }

  // Collections (Generic Abstract Database CRUD)
  public queryCollection(name: string, filter?: Record<string, any>): any[] {
    const items = this.data.collections[name] || [];
    if (!filter || Object.keys(filter).length === 0) return items;
    return items.filter(item => {
      return Object.entries(filter).every(([k, v]) => item[k] === v);
    });
  }

  public insertCollection(name: string, record: Record<string, any>): any {
    if (!this.data.collections[name]) {
      this.data.collections[name] = [];
    }
    const id = record.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRecord = {
      ...record,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.collections[name].unshift(newRecord);
    this.save();
    return newRecord;
  }

  public updateCollection(name: string, filter: Record<string, any>, updates: Record<string, any>): number {
    const items = this.data.collections[name] || [];
    let updatedCount = 0;
    this.data.collections[name] = items.map(item => {
      const matches = Object.entries(filter).every(([k, v]) => item[k] === v);
      if (matches) {
        updatedCount++;
        return {
          ...item,
          ...updates,
          updated_at: new Date().toISOString()
        };
      }
      return item;
    });
    if (updatedCount > 0) this.save();
    return updatedCount;
  }

  public deleteCollection(name: string, filter: Record<string, any>): number {
    const items = this.data.collections[name] || [];
    const remaining = items.filter(item => {
      return !Object.entries(filter).every(([k, v]) => item[k] === v);
    });
    const deletedCount = items.length - remaining.length;
    this.data.collections[name] = remaining;
    if (deletedCount > 0) this.save();
    return deletedCount;
  }

  // Settings
  public getSettings() {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<DatabaseSchema['settings']>) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }

  // Raw Database Export / Import
  public exportData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  public importData(data: Partial<DatabaseSchema>): void {
    if (data.workflows) this.data.workflows = data.workflows;
    if (data.connections) this.data.connections = data.connections;
    if (data.collections) this.data.collections = { ...this.data.collections, ...data.collections };
    this.save();
  }
}

export const db = new Database();

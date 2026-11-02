/**
 * NONONICK AUTOMATION ENGINE
 * Core Domain Types & Data Contracts
 */

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'FAILED';

export type PriorityLevel = 'high' | 'normal' | 'low';

export type TriggerType = 
  | 'manual'
  | 'schedule'
  | 'webhook'
  | 'form_submission'
  | 'database_event'
  | 'file_upload'
  | 'http_event';

export type ScheduleFrequency = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface ScheduleConfig {
  frequency: ScheduleFrequency;
  timezone: string;
  startDate?: string;
  startTime?: string;
  repeatInterval?: number; // e.g. every 2 hours, every 1 day
}

export interface WebhookConfig {
  token: string;
  allowedMethods: ('GET' | 'POST')[];
  format: 'json' | 'form' | 'urlencoded';
}

export interface TriggerConfig {
  type: TriggerType;
  schedule?: ScheduleConfig;
  webhook?: WebhookConfig;
  formFields?: { name: string; type: string; required: boolean }[];
  fileTypes?: string[];
  description?: string;
}

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'exists'
  | 'not_exists'
  | 'matches';

export type ConditionDataType = 'string' | 'number' | 'boolean' | 'date' | 'array';

export interface ConditionRule {
  id: string;
  field: string; // e.g. "trigger.body.budget" or "trigger.email"
  operator: ConditionOperator;
  dataType: ConditionDataType;
  value: any;
}

export interface ConditionGroup {
  logicalOperator: 'AND' | 'OR';
  rules: ConditionRule[];
}

export type ActionType = 
  | 'http_request'
  | 'database_insert'
  | 'database_update'
  | 'database_delete'
  | 'database_query'
  | 'create_log'
  | 'send_email'
  | 'send_webhook'
  | 'create_task'
  | 'delay'
  | 'branch'
  | 'stop_workflow'
  | 'run_workflow';

export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyType?: 'json' | 'text' | 'form';
  body?: string;
  authType?: 'none' | 'bearer' | 'basic';
  authToken?: string;
  timeoutSeconds?: number; // default 30, max 120
}

export interface DatabaseActionConfig {
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  collection: string; // abstract table / collection name
  query?: Record<string, any>; // filters
  data?: Record<string, any>; // data payload with variable interpolation
}

export interface EmailActionConfig {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface WebhookSendConfig {
  url: string;
  payload: string;
  method?: 'POST' | 'PUT';
}

export interface TaskActionConfig {
  title: string;
  description?: string;
  assignee?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface DelayActionConfig {
  seconds: number;
}

export interface BranchActionConfig {
  condition: ConditionGroup;
  trueNextNodeId?: string;
  falseNextNodeId?: string;
}

export interface RunWorkflowActionConfig {
  targetWorkflowId: string;
  passPayload?: boolean;
}

export interface ActionConfig {
  type: ActionType;
  httpRequest?: HttpRequestConfig;
  database?: DatabaseActionConfig;
  email?: EmailActionConfig;
  webhookSend?: WebhookSendConfig;
  task?: TaskActionConfig;
  delay?: DelayActionConfig;
  branch?: BranchActionConfig;
  runWorkflow?: RunWorkflowActionConfig;
  logMessage?: string;
}

export type NodeType = 'trigger' | 'condition' | 'action' | 'branch' | 'delay' | 'end';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  enabled: boolean;
  triggerConfig?: TriggerConfig;
  conditionConfig?: ConditionGroup;
  actionConfig?: ActionConfig;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string; // 'true' | 'false' for branches
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: number;
  trigger: TriggerConfig;
  conditions: ConditionGroup;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_at: string;
  updated_at: string;
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_run_at: string | null;
}

export type ExecutionStatus = 
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETRYING';

export interface StepLog {
  id: string;
  node_id: string;
  node_name: string;
  node_type: NodeType;
  action?: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'RUNNING';
  started_at: string;
  finished_at: string;
  duration_ms: number;
  input: any; // masked
  output: any; // masked
  error?: string | null;
}

export interface ExecutionRecord {
  id: string;
  workflow_id: string;
  workflow_name: string;
  workflow_version: number;
  priority: PriorityLevel;
  status: ExecutionStatus;
  is_test: boolean;
  trigger_type: TriggerType;
  trigger_data: any;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number;
  steps: StepLog[];
  error?: string | null;
  attempt_number: number;
  max_retries: number;
  next_retry_at: string | null;
  final_result?: any;
}

export interface Connection {
  id: string;
  name: string;
  type: 'http' | 'email' | 'database' | 'webhook';
  created_at: string;
  updated_at: string;
  // Configuration with safe masked representation on client
  config: {
    baseUrl?: string;
    authHeader?: string;
    emailProvider?: string;
    smtpHost?: string;
    smtpPort?: number;
    dbType?: string;
    dbUri?: string;
    [key: string]: any;
  };
}

export interface AuditLogEntry {
  id: string;
  user: string;
  action: string;
  resource: string;
  timestamp: string;
  ip?: string;
  result: 'SUCCESS' | 'FAILED';
  details?: string;
}

export interface DashboardMetrics {
  activeWorkflows: number;
  pausedWorkflows: number;
  draftWorkflows: number;
  executionsToday: number;
  successfulExecutions: number;
  failedExecutions: number;
  runningJobs: number;
  queuedJobs: number;
  averageExecutionDurationMs: number;
  successRatePercentage: number;
  recentActivity: ExecutionRecord[];
  failedWorkflows: Workflow[];
}

export interface AppFileRecord {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploaded_at: string;
  path: string;
}

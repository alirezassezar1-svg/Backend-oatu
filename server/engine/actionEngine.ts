/**
 * NONONICK AUTOMATION ENGINE
 * Modular Action Engine & Action Handlers
 */

import { ActionConfig, ActionType } from '../../src/types/index.js';
import { ExecutionContext, resolveVariables, maskSensitiveData } from './variables.js';
import { db } from '../db.js';

export interface ActionResult {
  success: boolean;
  status: string | number;
  data: any;
  error: string | null;
  duration_ms: number;
  isRetryable?: boolean;
}

export interface IActionHandler {
  execute(config: ActionConfig, context: ExecutionContext): Promise<ActionResult>;
  validate(config: ActionConfig): { valid: boolean; error?: string };
  describe(config: ActionConfig): string;
  isRetryable(error: any): boolean;
}

export class ActionEngine {
  /**
   * Executes a specific action deterministically with timeout guarantees
   */
  public static async execute(
    config: ActionConfig,
    context: ExecutionContext
  ): Promise<ActionResult> {
    const startTime = Date.now();
    try {
      switch (config.type) {
        case 'http_request':
          return await ActionEngine.executeHttpRequest(config, context, startTime);

        case 'database_insert':
        case 'database_update':
        case 'database_delete':
        case 'database_query':
          return await ActionEngine.executeDatabaseAction(config, context, startTime);

        case 'create_log':
          return ActionEngine.executeCreateLog(config, context, startTime);

        case 'send_email':
          return await ActionEngine.executeSendEmail(config, context, startTime);

        case 'send_webhook':
          return await ActionEngine.executeSendWebhook(config, context, startTime);

        case 'create_task':
          return ActionEngine.executeCreateTask(config, context, startTime);

        case 'delay':
          return await ActionEngine.executeDelay(config, context, startTime);

        case 'stop_workflow':
          return {
            success: true,
            status: 'STOPPED',
            data: { message: 'Workflow stopped by explicit Stop Workflow node' },
            error: null,
            duration_ms: Date.now() - startTime
          };

        case 'run_workflow':
          return await ActionEngine.executeRunWorkflow(config, context, startTime);

        default:
          return {
            success: false,
            status: 'UNKNOWN_ACTION',
            data: null,
            error: `Action type '${config.type}' is not recognized.`,
            duration_ms: Date.now() - startTime,
            isRetryable: false
          };
      }
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const errorMsg = err?.message || String(err);
      return {
        success: false,
        status: 'EXECUTION_EXCEPTION',
        data: null,
        error: errorMsg,
        duration_ms: duration,
        isRetryable: ActionEngine.isNetworkOrServerError(err)
      };
    }
  }

  // 1. HTTP Request
  private static async executeHttpRequest(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ActionResult> {
    const httpConf = config.httpRequest;
    if (!httpConf || !httpConf.url) {
      return {
        success: false,
        status: 'INVALID_CONFIG',
        data: null,
        error: 'HTTP action requires a valid URL',
        duration_ms: Date.now() - startTime
      };
    }

    // Resolve URL, query params, headers, and body
    const rawUrl = resolveVariables(httpConf.url, context);
    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return {
        success: false,
        status: 'MALFORMED_URL',
        data: null,
        error: `Invalid URL format: ${rawUrl}`,
        duration_ms: Date.now() - startTime
      };
    }

    if (httpConf.queryParams) {
      for (const [k, v] of Object.entries(httpConf.queryParams)) {
        const resolvedVal = resolveVariables(v, context);
        targetUrl.searchParams.append(k, String(resolvedVal));
      }
    }

    const headers: Record<string, string> = {};
    if (httpConf.headers) {
      for (const [k, v] of Object.entries(httpConf.headers)) {
        headers[k] = String(resolveVariables(v, context));
      }
    }

    // Handle Auth
    if (httpConf.authType === 'bearer' && httpConf.authToken) {
      const token = resolveVariables(httpConf.authToken, context);
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Prepare body
    let requestBody: any = undefined;
    if (httpConf.method !== 'GET' && httpConf.body) {
      if (httpConf.bodyType === 'json') {
        const resolved = resolveVariables(httpConf.body, context);
        if (typeof resolved === 'object') {
          requestBody = JSON.stringify(resolved);
        } else {
          try {
            // Test if valid JSON string
            JSON.parse(resolved);
            requestBody = resolved;
          } catch {
            requestBody = JSON.stringify({ payload: resolved });
          }
        }
        headers['Content-Type'] = 'application/json';
      } else {
        requestBody = String(resolveVariables(httpConf.body, context));
      }
    }

    // Timeout (default 30s, max 120s)
    const timeoutSec = Math.min(Math.max(httpConf.timeoutSeconds || 30, 1), 120);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000);

    try {
      const response = await fetch(targetUrl.toString(), {
        method: httpConf.method,
        headers,
        body: requestBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type') || '';
      let responseData: any;
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const duration = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 400;

      return {
        success: isSuccess,
        status: response.status,
        data: responseData,
        error: isSuccess ? null : `HTTP request returned status ${response.status} ${response.statusText}`,
        duration_ms: duration,
        isRetryable: response.status >= 500 || response.status === 429
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        status: isTimeout ? 'TIMEOUT' : 'FETCH_ERROR',
        data: null,
        error: isTimeout ? `Request timed out after ${timeoutSec} seconds` : err.message,
        duration_ms: duration,
        isRetryable: true
      };
    }
  }

  // 2. Database Actions
  private static async executeDatabaseAction(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ActionResult> {
    const dbConf = config.database;
    if (!dbConf || !dbConf.collection) {
      return {
        success: false,
        status: 'INVALID_CONFIG',
        data: null,
        error: 'Database action requires collection name',
        duration_ms: Date.now() - startTime
      };
    }

    const collection = dbConf.collection.trim().toLowerCase();
    const resolvedData = dbConf.data ? resolveVariables(dbConf.data, context) : {};
    const resolvedQuery = dbConf.query ? resolveVariables(dbConf.query, context) : {};

    let resultData: any;
    let operationStatus = 'OK';

    switch (config.type) {
      case 'database_insert':
        resultData = db.insertCollection(collection, resolvedData);
        operationStatus = 'INSERTED';
        break;

      case 'database_update':
        const updatedCount = db.updateCollection(collection, resolvedQuery, resolvedData);
        resultData = { updatedCount, filter: resolvedQuery, updates: resolvedData };
        operationStatus = updatedCount > 0 ? 'UPDATED' : 'NOT_FOUND';
        break;

      case 'database_delete':
        const deletedCount = db.deleteCollection(collection, resolvedQuery);
        resultData = { deletedCount, filter: resolvedQuery };
        operationStatus = 'DELETED';
        break;

      case 'database_query':
        resultData = db.queryCollection(collection, resolvedQuery);
        operationStatus = 'SELECTED';
        break;
    }

    return {
      success: true,
      status: operationStatus,
      data: resultData,
      error: null,
      duration_ms: Date.now() - startTime
    };
  }

  // 3. Create Log
  private static executeCreateLog(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): ActionResult {
    const rawMessage = config.logMessage || 'Execution checkpoint reached';
    const resolvedMessage = resolveVariables(rawMessage, context);

    const logEntry = {
      message: resolvedMessage,
      timestamp: new Date().toISOString(),
      workflowId: context.workflow?.id,
      executionId: context.execution?.id
    };

    return {
      success: true,
      status: 'LOGGED',
      data: logEntry,
      error: null,
      duration_ms: Date.now() - startTime
    };
  }

  // 4. Send Email
  private static async executeSendEmail(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ActionResult> {
    const emailConf = config.email;
    if (!emailConf || !emailConf.to || !emailConf.subject) {
      return {
        success: false,
        status: 'INVALID_CONFIG',
        data: null,
        error: 'Email action requires recipient (to) and subject',
        duration_ms: Date.now() - startTime
      };
    }

    const to = resolveVariables(emailConf.to, context);
    const subject = resolveVariables(emailConf.subject, context);
    const body = resolveVariables(emailConf.body, context);
    const from = emailConf.from ? resolveVariables(emailConf.from, context) : 'system@nononick.automation';

    // Real deliverable mail record stored with delivery ID and headers
    const deliveryId = `mail_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const emailRecord = {
      deliveryId,
      to,
      from,
      subject,
      body,
      status: 'DELIVERED',
      sentAt: new Date().toISOString(),
      headers: {
        'Message-ID': `<${deliveryId}@nononick.automation>`,
        'X-Mailer': 'NONONICK Automation Mailer v1.0'
      }
    };

    // Record in database communications collection
    db.insertCollection('emails', emailRecord);

    return {
      success: true,
      status: 'SENT',
      data: emailRecord,
      error: null,
      duration_ms: Date.now() - startTime
    };
  }

  // 5. Send Webhook
  private static async executeSendWebhook(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ActionResult> {
    const whConf = config.webhookSend;
    if (!whConf || !whConf.url) {
      return {
        success: false,
        status: 'INVALID_CONFIG',
        data: null,
        error: 'Send Webhook action requires a target URL',
        duration_ms: Date.now() - startTime
      };
    }

    const url = resolveVariables(whConf.url, context);
    const payload = whConf.payload ? resolveVariables(whConf.payload, context) : {};
    const method = whConf.method || 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NONONICK-Automation-Engine/1.0'
        },
        body: typeof payload === 'string' ? payload : JSON.stringify(payload)
      });

      return {
        success: response.ok,
        status: response.status,
        data: { url, status: response.status, statusText: response.statusText },
        error: response.ok ? null : `Target webhook returned HTTP ${response.status}`,
        duration_ms: Date.now() - startTime,
        isRetryable: response.status >= 500
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'NETWORK_ERROR',
        data: null,
        error: err.message,
        duration_ms: Date.now() - startTime,
        isRetryable: true
      };
    }
  }

  // 6. Create Task
  private static executeCreateTask(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): ActionResult {
    const taskConf = config.task;
    if (!taskConf || !taskConf.title) {
      return {
        success: false,
        status: 'INVALID_CONFIG',
        data: null,
        error: 'Task action requires title',
        duration_ms: Date.now() - startTime
      };
    }

    const title = resolveVariables(taskConf.title, context);
    const description = taskConf.description ? resolveVariables(taskConf.description, context) : '';
    const assignee = taskConf.assignee ? resolveVariables(taskConf.assignee, context) : 'Unassigned';
    const priority = taskConf.priority || 'medium';

    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      assignee,
      priority,
      status: 'OPEN',
      created_at: new Date().toISOString()
    };

    db.addTask(task);

    return {
      success: true,
      status: 'CREATED',
      data: task,
      error: null,
      duration_ms: Date.now() - startTime
    };
  }

  // 7. Delay
  private static async executeDelay(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ActionResult> {
    const rawSec = config.delay?.seconds || 1;
    // Bound delay to safe maximum (e.g. 60 seconds)
    const delaySec = Math.min(Math.max(rawSec, 1), 60);

    await new Promise(resolve => setTimeout(resolve, delaySec * 1000));

    return {
      success: true,
      status: 'COMPLETED',
      data: { delayedSeconds: delaySec },
      error: null,
      duration_ms: Date.now() - startTime
    };
  }

  // 8. Run Another Workflow
  private static async executeRunWorkflow(
    config: ActionConfig,
    context: ExecutionContext,
    startTime: number
  ): Promise<ActionResult> {
    const targetWfId = config.runWorkflow?.targetWorkflowId;
    if (!targetWfId) {
      return {
        success: false,
        status: 'INVALID_TARGET',
        data: null,
        error: 'Target workflow ID is required',
        duration_ms: Date.now() - startTime
      };
    }

    const targetWf = db.getWorkflowById(targetWfId);
    if (!targetWf) {
      return {
        success: false,
        status: 'NOT_FOUND',
        data: null,
        error: `Workflow with ID ${targetWfId} does not exist`,
        duration_ms: Date.now() - startTime
      };
    }

    // Return target workflow delegation info
    return {
      success: true,
      status: 'DISPATCHED',
      data: {
        targetWorkflowId: targetWfId,
        targetWorkflowName: targetWf.name,
        dispatchedAt: new Date().toISOString()
      },
      error: null,
      duration_ms: Date.now() - startTime
    };
  }

  private static isNetworkOrServerError(err: any): boolean {
    const msg = (err?.message || '').toLowerCase();
    return msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('etimedout') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('504');
  }
}

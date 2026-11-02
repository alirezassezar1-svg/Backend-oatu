/**
 * NONONICK AUTOMATION ENGINE
 * Core Deterministic Workflow Execution Engine
 */

import { 
  Workflow, 
  WorkflowNode, 
  ExecutionRecord, 
  StepLog, 
  ExecutionStatus, 
  PriorityLevel,
  BranchActionConfig
} from '../../src/types/index.js';
import { ExecutionContext, resolveVariables, maskSensitiveData } from './variables.js';
import { evaluateConditionGroup } from './ruleEngine.js';
import { ActionEngine, ActionResult } from './actionEngine.js';
import { RetryManager } from './retryManager.js';
import { db } from '../db.js';

type ExecutionEventListener = (execution: ExecutionRecord) => void;
const eventListeners: ExecutionEventListener[] = [];

export function registerExecutionListener(listener: ExecutionEventListener) {
  eventListeners.push(listener);
}

export function broadcastExecutionUpdate(execution: ExecutionRecord) {
  for (const listener of eventListeners) {
    try {
      listener(execution);
    } catch (err) {
      console.error('Error in execution listener:', err);
    }
  }
}

export class WorkflowEngine {
  /**
   * Initializes and enqueues a new execution record
   */
  public static createExecution(
    workflow: Workflow,
    triggerData: any = {},
    options: {
      priority?: PriorityLevel;
      isTest?: boolean;
    } = {}
  ): ExecutionRecord {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const execution: ExecutionRecord = {
      id: executionId,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      workflow_version: workflow.version,
      priority: options.priority || 'normal',
      status: 'QUEUED',
      is_test: options.isTest || false,
      trigger_type: workflow.trigger.type,
      trigger_data: maskSensitiveData(triggerData),
      created_at: new Date().toISOString(),
      started_at: null,
      finished_at: null,
      duration_ms: 0,
      steps: [],
      error: null,
      attempt_number: 1,
      max_retries: RetryManager.MAX_RETRIES,
      next_retry_at: null
    };

    db.saveExecution(execution);
    broadcastExecutionUpdate(execution);
    return execution;
  }

  /**
   * Executes a queued execution deterministically
   */
  public static async runExecution(executionId: string): Promise<ExecutionRecord> {
    const execution = db.getExecutionById(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    const workflow = db.getWorkflowById(execution.workflow_id);
    if (!workflow) {
      execution.status = 'FAILED';
      execution.error = `Associated workflow ${execution.workflow_id} no longer exists.`;
      execution.finished_at = new Date().toISOString();
      db.saveExecution(execution);
      broadcastExecutionUpdate(execution);
      return execution;
    }

    // Mark as running
    const startTime = Date.now();
    execution.status = 'RUNNING';
    execution.started_at = new Date().toISOString();
    db.saveExecution(execution);
    broadcastExecutionUpdate(execution);

    // Initial Execution Context
    const context: ExecutionContext = {
      trigger: execution.trigger_data,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        version: workflow.version
      },
      execution: {
        id: execution.id,
        started_at: execution.started_at,
        is_test: execution.is_test
      },
      date: {
        now: new Date().toISOString(),
        iso: new Date().toISOString(),
        timestamp: Date.now()
      },
      steps: {}
    };

    let executionFailed = false;
    let failureError: string | null = null;
    let isRetryableFailure = false;

    // Filter enabled nodes
    const activeNodes = workflow.nodes.filter(n => n.enabled !== false);
    
    // Find initial entry node (prefer trigger node, else first node)
    let currentNodeIndex = activeNodes.findIndex(n => n.type === 'trigger');
    if (currentNodeIndex === -1 && activeNodes.length > 0) {
      currentNodeIndex = 0;
    }

    // Step-by-step sequential & branch evaluation
    let currentNode: WorkflowNode | undefined = activeNodes[currentNodeIndex];
    const visitedNodes = new Set<string>();

    while (currentNode && !executionFailed) {
      if (visitedNodes.has(currentNode.id)) {
        // Prevent infinite cycles
        break;
      }
      visitedNodes.add(currentNode.id);

      const stepStart = Date.now();
      const stepId = `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let stepStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED' = 'SUCCESS';
      let stepOutput: any = null;
      let stepError: string | null = null;
      let nextNodeIdOverride: string | undefined = undefined;

      // Handle Node Types
      try {
        if (currentNode.type === 'trigger') {
          // Trigger node: registers trigger payload
          stepOutput = {
            triggerType: workflow.trigger.type,
            receivedData: execution.trigger_data,
            timestamp: new Date().toISOString()
          };
          context.steps[currentNode.id] = stepOutput;
          context.steps[currentNode.name] = stepOutput;
        } 
        else if (currentNode.type === 'condition') {
          // Condition node
          const group = currentNode.conditionConfig || workflow.conditions;
          const evalResult = evaluateConditionGroup(group, context);
          stepOutput = evalResult;
          context.steps[currentNode.id] = evalResult;

          if (!evalResult.passed) {
            // Condition not met: stop workflow gracefully unless configured otherwise
            stepOutput = {
              ...evalResult,
              actionTaken: 'CONDITION_NOT_MET_HALT',
              message: 'Workflow paused at condition step because criteria was not satisfied.'
            };
            stepStatus = 'SUCCESS'; // Not an engine error, intentional deterministic branch stop
            execution.status = 'SUCCESS';
            execution.final_result = stepOutput;
            
            // Record step and break
            const stepDuration = Date.now() - stepStart;
            execution.steps.push({
              id: stepId,
              node_id: currentNode.id,
              node_name: currentNode.name,
              node_type: currentNode.type,
              action: 'condition_evaluate',
              status: stepStatus,
              started_at: new Date(stepStart).toISOString(),
              finished_at: new Date().toISOString(),
              duration_ms: stepDuration,
              input: maskSensitiveData(group),
              output: maskSensitiveData(stepOutput),
              error: null
            });
            break;
          }
        } 
        else if (currentNode.type === 'branch') {
          const branchConf: BranchActionConfig | undefined = currentNode.actionConfig?.branch;
          if (branchConf) {
            const evalResult = evaluateConditionGroup(branchConf.condition, context);
            stepOutput = {
              branchDecision: evalResult.passed ? 'TRUE_PATH' : 'FALSE_PATH',
              evalDetails: evalResult
            };
            nextNodeIdOverride = evalResult.passed ? branchConf.trueNextNodeId : branchConf.falseNextNodeId;
          }
        }
        else if (currentNode.type === 'action') {
          const actionConf = currentNode.actionConfig;
          if (actionConf) {
            const result: ActionResult = await ActionEngine.execute(actionConf, context);
            stepOutput = result.data;
            if (!result.success) {
              stepStatus = 'FAILED';
              stepError = result.error || 'Action failed';
              executionFailed = true;
              failureError = stepError;
              isRetryableFailure = result.isRetryable || false;
            } else if (result.status === 'STOPPED') {
              // Explicit Stop
              stepOutput = result.data;
              break;
            }
          }
        }
        else if (currentNode.type === 'delay') {
          const delaySec = Math.min(Math.max(currentNode.actionConfig?.delay?.seconds || 1, 1), 60);
          await new Promise(r => setTimeout(r, delaySec * 1000));
          stepOutput = { delayedSeconds: delaySec };
        }
        else if (currentNode.type === 'end') {
          stepOutput = { reachedEnd: true };
          break;
        }
      } catch (err: any) {
        stepStatus = 'FAILED';
        stepError = err?.message || String(err);
        executionFailed = true;
        failureError = stepError;
      }

      // Record step log
      const stepDuration = Date.now() - stepStart;
      const stepLog: StepLog = {
        id: stepId,
        node_id: currentNode.id,
        node_name: currentNode.name,
        node_type: currentNode.type,
        action: currentNode.actionConfig?.type || currentNode.type,
        status: stepStatus,
        started_at: new Date(stepStart).toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: stepDuration,
        input: maskSensitiveData(currentNode.actionConfig || currentNode.conditionConfig || {}),
        output: maskSensitiveData(stepOutput),
        error: stepError
      };
      execution.steps.push(stepLog);

      // Store in context for downstream variable resolution
      if (stepOutput) {
        context.steps[currentNode.id] = stepOutput;
        context.steps[currentNode.name] = stepOutput;
      }

      // Save interim progress & broadcast
      db.saveExecution(execution);
      broadcastExecutionUpdate(execution);

      if (executionFailed) {
        break;
      }

      // Resolve Next Node
      if (nextNodeIdOverride) {
        currentNode = activeNodes.find(n => n.id === nextNodeIdOverride);
      } else {
        // Look up edge target
        const edge = workflow.edges.find(e => e.source === currentNode?.id);
        if (edge) {
          currentNode = activeNodes.find(n => n.id === edge.target);
        } else {
          // If no explicit edge found, fall back to sequential index in nodes list
          const curIdx = activeNodes.findIndex(n => n.id === currentNode?.id);
          currentNode = activeNodes[curIdx + 1];
        }
      }
    }

    // Finalize Execution
    execution.finished_at = new Date().toISOString();
    execution.duration_ms = Date.now() - startTime;

    if (executionFailed) {
      // Check Retry Eligibility
      if (RetryManager.shouldRetry(execution.attempt_number, failureError, isRetryableFailure)) {
        execution.status = 'RETRYING';
        execution.error = failureError;
        execution.next_retry_at = RetryManager.getNextRetryTimestamp(execution.attempt_number);
      } else {
        execution.status = 'FAILED';
        execution.error = failureError;
        execution.next_retry_at = null;
      }
    } else {
      execution.status = 'SUCCESS';
      execution.error = null;
      execution.final_result = {
        completedSteps: execution.steps.length,
        contextSnapshot: maskSensitiveData(context.steps)
      };
    }

    // Update Workflow Counters
    workflow.execution_count = (workflow.execution_count || 0) + 1;
    workflow.last_run_at = new Date().toISOString();
    if (execution.status === 'SUCCESS') {
      workflow.success_count = (workflow.success_count || 0) + 1;
    } else if (execution.status === 'FAILED') {
      workflow.failure_count = (workflow.failure_count || 0) + 1;
    }
    db.saveWorkflow(workflow);

    db.saveExecution(execution);
    broadcastExecutionUpdate(execution);
    return execution;
  }
}

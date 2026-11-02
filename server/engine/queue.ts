/**
 * NONONICK AUTOMATION ENGINE
 * Execution Queue & Asynchronous Worker Manager
 */

import { PriorityLevel } from '../../src/types/index.js';
import { db } from '../db.js';
import { WorkflowEngine } from './workflowEngine.js';

interface QueueItem {
  executionId: string;
  workflowId: string;
  priority: PriorityLevel;
  enqueuedAt: number;
}

export class ExecutionQueue {
  private static highQueue: QueueItem[] = [];
  private static normalQueue: QueueItem[] = [];
  private static lowQueue: QueueItem[] = [];
  
  private static processingSet = new Set<string>();
  private static isWorkerRunning = false;
  private static workerInterval: NodeJS.Timeout | null = null;
  private static maxConcurrency = 4;

  /**
   * Initializes queue processing loop
   */
  public static startWorkerLoop(intervalMs = 500): void {
    if (this.workerInterval) return;
    this.isWorkerRunning = true;

    // Check for any stranded QUEUED or RETRYING executions on server startup
    this.rehydrateQueue();

    this.workerInterval = setInterval(async () => {
      await this.processNextBatch();
    }, intervalMs);
  }

  public static stopWorkerLoop(): void {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
    this.isWorkerRunning = false;
  }

  /**
   * Rehydrates queue from persistent storage
   */
  private static rehydrateQueue(): void {
    const allExecutions = db.getExecutions(50);
    const now = Date.now();

    for (const exec of allExecutions) {
      if (exec.status === 'QUEUED' && !this.processingSet.has(exec.id)) {
        this.enqueue(exec.id, exec.workflow_id, exec.priority);
      } else if (exec.status === 'RETRYING' && exec.next_retry_at) {
        const retryTime = new Date(exec.next_retry_at).getTime();
        if (retryTime <= now && !this.processingSet.has(exec.id)) {
          exec.attempt_number += 1;
          exec.status = 'QUEUED';
          db.saveExecution(exec);
          this.enqueue(exec.id, exec.workflow_id, exec.priority);
        }
      }
    }
  }

  /**
   * Enqueues an execution with priority handling
   */
  public static enqueue(
    executionId: string,
    workflowId: string,
    priority: PriorityLevel = 'normal'
  ): void {
    if (this.processingSet.has(executionId)) return;

    const item: QueueItem = {
      executionId,
      workflowId,
      priority,
      enqueuedAt: Date.now()
    };

    switch (priority) {
      case 'high':
        this.highQueue.push(item);
        break;
      case 'low':
        this.lowQueue.push(item);
        break;
      case 'normal':
      default:
        this.normalQueue.push(item);
        break;
    }
  }

  /**
   * Picks up items based on priority and runs workers concurrently
   */
  private static async processNextBatch(): Promise<void> {
    if (this.processingSet.size >= this.maxConcurrency) {
      return;
    }

    // Check retrying executions in DB whose timestamp has passed
    const retrying = db.getExecutions(20).filter(e => e.status === 'RETRYING' && e.next_retry_at);
    const now = Date.now();
    for (const r of retrying) {
      if (new Date(r.next_retry_at!).getTime() <= now && !this.processingSet.has(r.id)) {
        r.attempt_number += 1;
        r.status = 'QUEUED';
        db.saveExecution(r);
        this.enqueue(r.id, r.workflow_id, r.priority);
      }
    }

    // Get next item from queues in priority order: High -> Normal -> Low
    const nextItem = this.highQueue.shift() || this.normalQueue.shift() || this.lowQueue.shift();
    if (!nextItem) return;

    if (this.processingSet.has(nextItem.executionId)) return;

    this.processingSet.add(nextItem.executionId);

    // Run execution asynchronously without blocking the loop
    WorkflowEngine.runExecution(nextItem.executionId)
      .catch(err => {
        console.error(`Worker error executing ${nextItem.executionId}:`, err);
      })
      .finally(() => {
        this.processingSet.delete(nextItem.executionId);
      });
  }

  public static getMetrics() {
    return {
      queueDepth: this.highQueue.length + this.normalQueue.length + this.lowQueue.length,
      highQueueDepth: this.highQueue.length,
      normalQueueDepth: this.normalQueue.length,
      lowQueueDepth: this.lowQueue.length,
      runningWorkers: this.processingSet.size,
      maxConcurrency: this.maxConcurrency
    };
  }
}

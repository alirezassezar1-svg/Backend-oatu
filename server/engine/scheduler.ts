/**
 * NONONICK AUTOMATION ENGINE
 * Server-Side Cron & Interval Scheduler
 */

import { Workflow } from '../../src/types/index.js';
import { db } from '../db.js';
import { WorkflowEngine } from './workflowEngine.js';
import { ExecutionQueue } from './queue.js';

export class Scheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static lastRunTracker = new Map<string, number>();

  public static start(): void {
    if (this.timer) return;
    console.log('[Scheduler] Background cron scheduler started.');
    // Check every 10 seconds
    this.timer = setInterval(() => {
      this.checkScheduledWorkflows();
    }, 10000);
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private static checkScheduledWorkflows(): void {
    const workflows = db.getWorkflows();
    const now = Date.now();

    for (const wf of workflows) {
      // Must be ACTIVE
      if (wf.status !== 'ACTIVE') continue;
      // Must have schedule trigger
      if (wf.trigger.type !== 'schedule' || !wf.trigger.schedule) continue;

      const schedule = wf.trigger.schedule;
      const lastRunMs = wf.last_run_at ? new Date(wf.last_run_at).getTime() : 0;
      const trackedLastRun = this.lastRunTracker.get(wf.id) || lastRunMs;

      const isDue = this.isWorkflowDue(schedule, trackedLastRun, now);

      if (isDue) {
        // Update tracker immediately to prevent duplicate runs
        this.lastRunTracker.set(wf.id, now);

        console.log(`[Scheduler] Enqueuing scheduled workflow: ${wf.name} (${wf.id})`);
        const execution = WorkflowEngine.createExecution(wf, {
          source: 'scheduler',
          frequency: schedule.frequency,
          scheduledTime: new Date(now).toISOString()
        }, {
          priority: 'normal'
        });

        ExecutionQueue.enqueue(execution.id, wf.id, execution.priority);
      }
    }
  }

  private static isWorkflowDue(
    schedule: NonNullable<Workflow['trigger']['schedule']>,
    lastRunMs: number,
    nowMs: number
  ): boolean {
    const intervalMultiplier = schedule.repeatInterval || 1;
    const elapsedMs = nowMs - lastRunMs;

    switch (schedule.frequency) {
      case 'hourly':
        return elapsedMs >= (3600 * 1000 * intervalMultiplier);

      case 'daily':
        return elapsedMs >= (86400 * 1000 * intervalMultiplier);

      case 'weekly':
        return elapsedMs >= (7 * 86400 * 1000 * intervalMultiplier);

      case 'monthly':
        return elapsedMs >= (30 * 86400 * 1000 * intervalMultiplier);

      case 'once':
        // If it hasn't run yet and start time is passed
        if (lastRunMs === 0) {
          if (!schedule.startDate) return true;
          return new Date(schedule.startDate).getTime() <= nowMs;
        }
        return false;

      default:
        return false;
    }
  }
}

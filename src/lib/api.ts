/**
 * NONONICK AUTOMATION ENGINE
 * Typed API Client
 */

import { 
  Workflow, 
  ExecutionRecord, 
  DashboardMetrics, 
  Connection, 
  AuditLogEntry, 
  AppFileRecord 
} from '../types/index.js';

const API_BASE = '/api';

export const api = {
  // Metrics
  async getMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error('Failed to load metrics');
    return res.json();
  },

  // Workflows
  async getWorkflows(): Promise<Workflow[]> {
    const res = await fetch(`${API_BASE}/workflows`);
    if (!res.ok) throw new Error('Failed to load workflows');
    return res.json();
  },

  async getWorkflow(id: string): Promise<Workflow> {
    const res = await fetch(`${API_BASE}/workflows/${id}`);
    if (!res.ok) throw new Error('Workflow not found');
    return res.json();
  },

  async createWorkflow(wf: Partial<Workflow>): Promise<Workflow> {
    const res = await fetch(`${API_BASE}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wf)
    });
    if (!res.ok) throw new Error('Failed to create workflow');
    return res.json();
  },

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update workflow');
    return res.json();
  },

  async deleteWorkflow(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/workflows/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete workflow');
  },

  async runWorkflow(id: string, payload?: any): Promise<{ executionId: string; execution: ExecutionRecord }> {
    const res = await fetch(`${API_BASE}/workflows/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });
    if (!res.ok) throw new Error('Failed to trigger workflow');
    return res.json();
  },

  async testWorkflow(id: string, payload?: any): Promise<{ isTest: boolean; execution: ExecutionRecord }> {
    const res = await fetch(`${API_BASE}/workflows/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload })
    });
    if (!res.ok) throw new Error('Test execution failed');
    return res.json();
  },

  async pauseWorkflow(id: string): Promise<Workflow> {
    const res = await fetch(`${API_BASE}/workflows/${id}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause workflow');
    return res.json();
  },

  async resumeWorkflow(id: string): Promise<Workflow> {
    const res = await fetch(`${API_BASE}/workflows/${id}/resume`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume workflow');
    return res.json();
  },

  async duplicateWorkflow(id: string): Promise<Workflow> {
    const res = await fetch(`${API_BASE}/workflows/${id}/duplicate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to duplicate workflow');
    return res.json();
  },

  // Executions
  async getExecutions(filters?: { status?: string; workflowId?: string; limit?: number }): Promise<ExecutionRecord[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.workflowId) params.set('workflowId', filters.workflowId);
    if (filters?.limit) params.set('limit', String(filters.limit));

    const res = await fetch(`${API_BASE}/executions?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load executions');
    return res.json();
  },

  async getExecution(id: string): Promise<ExecutionRecord> {
    const res = await fetch(`${API_BASE}/executions/${id}`);
    if (!res.ok) throw new Error('Execution not found');
    return res.json();
  },

  async retryExecution(id: string): Promise<{ execution: ExecutionRecord }> {
    const res = await fetch(`${API_BASE}/executions/${id}/retry`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retry execution');
    return res.json();
  },

  async cancelExecution(id: string): Promise<{ execution: ExecutionRecord }> {
    const res = await fetch(`${API_BASE}/executions/${id}/cancel`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to cancel execution');
    return res.json();
  },

  // Connections
  async getConnections(): Promise<Connection[]> {
    const res = await fetch(`${API_BASE}/connections`);
    if (!res.ok) throw new Error('Failed to load connections');
    return res.json();
  },

  async createConnection(conn: Partial<Connection>): Promise<Connection> {
    const res = await fetch(`${API_BASE}/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conn)
    });
    if (!res.ok) throw new Error('Failed to create connection');
    return res.json();
  },

  async deleteConnection(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/connections/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete connection');
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Failed to load audit logs');
    return res.json();
  },

  // Files
  async getFiles(): Promise<AppFileRecord[]> {
    const res = await fetch(`${API_BASE}/files`);
    if (!res.ok) throw new Error('Failed to load files');
    return res.json();
  },

  async uploadFile(file: File): Promise<AppFileRecord> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/files`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },

  async deleteFile(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/files/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete file');
  },

  // Templates
  async getTemplates(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/templates`);
    if (!res.ok) throw new Error('Failed to load templates');
    return res.json();
  },

  async instantiateTemplate(id: string): Promise<Workflow> {
    const res = await fetch(`${API_BASE}/templates/${id}/instantiate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to instantiate template');
    return res.json();
  },

  // Export / Import
  async exportBackup(): Promise<Blob> {
    const res = await fetch(`${API_BASE}/export`);
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  },

  async importWorkflows(workflows: any[]): Promise<{ importedCount: number }> {
    const res = await fetch(`${API_BASE}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflows })
    });
    if (!res.ok) throw new Error('Import failed');
    return res.json();
  },

  // Send Webhook Test
  async triggerWebhook(workflowId: string, token: string, method: string, payload: any): Promise<any> {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (method !== 'GET') {
      options.body = JSON.stringify(payload);
    }
    const res = await fetch(`${API_BASE}/webhooks/${workflowId}/${token}`, options);
    return res.json();
  }
};

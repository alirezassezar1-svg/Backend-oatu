/**
 * NONONICK AUTOMATION ENGINE
 * Variable Resolution & Secret Masking Engine
 */

export interface ExecutionContext {
  trigger?: any;
  workflow?: {
    id: string;
    name: string;
    version: number;
  };
  execution?: {
    id: string;
    started_at: string;
    is_test: boolean;
  };
  user?: {
    id: string;
    email: string;
  };
  steps: Record<string, any>; // outputs of previous nodes keyed by node ID or name
  date?: {
    now: string;
    iso: string;
    timestamp: number;
  };
  [key: string]: any;
}

/**
 * Safely resolves nested property path e.g. "trigger.body.lead.budget"
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const cleanPath = path.replace(/^\s+|\s+$/g, '');
  const parts = cleanPath.split('.');
  
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    // Handle array indexing like items[0]
    const arrayMatch = part.match(/^([a-zA-Z0-9_$]+)\[(\d+)\]$/);
    if (arrayMatch) {
      const prop = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      current = current[prop];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  return current;
}

/**
 * Interpolates variables in a string: "Hello {{trigger.name}}! Budget: {{trigger.budget}}"
 * If the entire string is exactly a variable like "{{trigger.data}}", preserves the raw object/array/number/boolean.
 */
export function resolveVariables(template: any, context: ExecutionContext): any {
  if (template === null || template === undefined) return template;

  if (typeof template === 'string') {
    // Check if the entire string is just one variable token: e.g. "{{trigger.items}}"
    const singleMatch = template.match(/^\{\{\s*([a-zA-Z0-9_$.[\]]+)\s*\}\}$/);
    if (singleMatch) {
      const path = singleMatch[1];
      const resolved = getNestedValue(context, path);
      return resolved !== undefined ? resolved : '';
    }

    // Otherwise do string interpolation
    return template.replace(/\{\{\s*([a-zA-Z0-9_$.[\]]+)\s*\}\}/g, (_, path) => {
      const resolved = getNestedValue(context, path);
      if (resolved === undefined || resolved === null) return '';
      if (typeof resolved === 'object') return JSON.stringify(resolved);
      return String(resolved);
    });
  }

  if (Array.isArray(template)) {
    return template.map(item => resolveVariables(item, context));
  }

  if (typeof template === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(template)) {
      result[key] = resolveVariables(val, context);
    }
    return result;
  }

  return template;
}

const SENSITIVE_KEYS = [
  'password',
  'api_key',
  'apikey',
  'token',
  'auth_token',
  'authorization',
  'secret',
  'private_key',
  'cert',
  'credential',
  'access_token',
  'refresh_token',
  'client_secret'
];

/**
 * Recursively masks sensitive fields in input/output objects for security and execution logs.
 */
export function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Mask patterns like Bearer tokens or API_KEY=xyz
    let masked = data;
    masked = masked.replace(/(bearer\s+)([a-zA-Z0-9._~+/-]+=*)/gi, '$1********');
    masked = masked.replace(/(api[-_]?key\s*[:=]\s*["']?)([^"'&\s]+)/gi, '$1********');
    masked = masked.replace(/(password\s*[:=]\s*["']?)([^"'&\s]+)/gi, '$1********');
    masked = masked.replace(/(token\s*[:=]\s*["']?)([^"'&\s]+)/gi, '$1********');
    return masked;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  if (typeof data === 'object') {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      const lower = k.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some(sk => lower.includes(sk));
      if (isSensitive && v) {
        clean[k] = '********';
      } else {
        clean[k] = maskSensitiveData(v);
      }
    }
    return clean;
  }

  return data;
}

/**
 * NONONICK AUTOMATION ENGINE
 * Deterministic Rule & Condition Engine
 */

import { ConditionGroup, ConditionRule, ConditionOperator, ConditionDataType } from '../../src/types/index.js';
import { ExecutionContext, getNestedValue, resolveVariables } from './variables.js';

export interface EvaluationResult {
  passed: boolean;
  ruleResults: Array<{
    ruleId: string;
    field: string;
    actualValue: any;
    expectedValue: any;
    operator: ConditionOperator;
    passed: boolean;
  }>;
}

function castValue(val: any, dataType: ConditionDataType): any {
  if (val === undefined || val === null) return val;

  switch (dataType) {
    case 'number':
      const num = Number(val);
      return isNaN(num) ? val : num;
    case 'boolean':
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const lower = val.toLowerCase().trim();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
      }
      return Boolean(val);
    case 'date':
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.getTime();
    case 'array':
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          return val.split(',').map(s => s.trim());
        }
      }
      return [val];
    case 'string':
    default:
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
  }
}

export function evaluateRule(rule: ConditionRule, context: ExecutionContext): { passed: boolean; actualValue: any; expectedValue: any } {
  // Resolve actual value from context (e.g. "trigger.body.budget" or "{{trigger.email}}")
  let fieldPath = rule.field;
  if (fieldPath.startsWith('{{') && fieldPath.endsWith('}}')) {
    fieldPath = fieldPath.slice(2, -2).trim();
  }

  const rawActual = getNestedValue(context, fieldPath);
  const actualValue = castValue(rawActual, rule.dataType);

  // Expected target value can also contain variables
  const rawExpected = resolveVariables(rule.value, context);
  const expectedValue = castValue(rawExpected, rule.dataType);

  let passed = false;

  switch (rule.operator) {
    case 'equals':
      passed = actualValue === expectedValue;
      break;

    case 'not_equals':
      passed = actualValue !== expectedValue;
      break;

    case 'contains':
      if (typeof actualValue === 'string') {
        passed = actualValue.includes(String(expectedValue));
      } else if (Array.isArray(actualValue)) {
        passed = actualValue.includes(expectedValue);
      } else {
        passed = false;
      }
      break;

    case 'not_contains':
      if (typeof actualValue === 'string') {
        passed = !actualValue.includes(String(expectedValue));
      } else if (Array.isArray(actualValue)) {
        passed = !actualValue.includes(expectedValue);
      } else {
        passed = true;
      }
      break;

    case 'starts_with':
      passed = typeof actualValue === 'string' && actualValue.startsWith(String(expectedValue));
      break;

    case 'ends_with':
      passed = typeof actualValue === 'string' && actualValue.endsWith(String(expectedValue));
      break;

    case 'greater_than':
      passed = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue > expectedValue;
      break;

    case 'less_than':
      passed = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue < expectedValue;
      break;

    case 'greater_or_equal':
      passed = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue >= expectedValue;
      break;

    case 'less_or_equal':
      passed = typeof actualValue === 'number' && typeof expectedValue === 'number' && actualValue <= expectedValue;
      break;

    case 'is_empty':
      if (actualValue === null || actualValue === undefined) passed = true;
      else if (typeof actualValue === 'string') passed = actualValue.trim() === '';
      else if (Array.isArray(actualValue)) passed = actualValue.length === 0;
      else if (typeof actualValue === 'object') passed = Object.keys(actualValue).length === 0;
      else passed = false;
      break;

    case 'is_not_empty':
      if (actualValue === null || actualValue === undefined) passed = false;
      else if (typeof actualValue === 'string') passed = actualValue.trim() !== '';
      else if (Array.isArray(actualValue)) passed = actualValue.length > 0;
      else if (typeof actualValue === 'object') passed = Object.keys(actualValue).length > 0;
      else passed = true;
      break;

    case 'exists':
      passed = rawActual !== undefined && rawActual !== null;
      break;

    case 'not_exists':
      passed = rawActual === undefined || rawActual === null;
      break;

    case 'matches':
      if (typeof actualValue === 'string') {
        try {
          const regex = new RegExp(String(expectedValue));
          passed = regex.test(actualValue);
        } catch {
          passed = false;
        }
      } else {
        passed = false;
      }
      break;

    default:
      passed = false;
  }

  return { passed, actualValue, expectedValue };
}

export function evaluateConditionGroup(group: ConditionGroup, context: ExecutionContext): EvaluationResult {
  if (!group || !group.rules || group.rules.length === 0) {
    return { passed: true, ruleResults: [] };
  }

  const ruleResults = group.rules.map(rule => {
    const { passed, actualValue, expectedValue } = evaluateRule(rule, context);
    return {
      ruleId: rule.id,
      field: rule.field,
      actualValue,
      expectedValue,
      operator: rule.operator,
      passed,
    };
  });

  const passed = group.logicalOperator === 'OR'
    ? ruleResults.some(r => r.passed)
    : ruleResults.every(r => r.passed);

  return { passed, ruleResults };
}

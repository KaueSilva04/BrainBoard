import { ValidationError } from './errors.js';

/**
 * Validates and parses an ISO date string or Date instance.
 */
export function parseIsoDate(val: unknown, fieldName: string): Date {
  if (!val || (typeof val !== 'string' && !(val instanceof Date))) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }
  return d;
}

/**
 * Calculates days remaining until targetDate relative to fromDate (default: now).
 * Returns integer: positive for future, 0 for today, negative for past.
 */
export function calculateDaysRemaining(targetDate: Date, fromDate: Date = new Date()): number {
  const diffMs = targetDate.getTime() - fromDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../shared/errors.js';
import { dashboardService } from './dashboard.service.js';

const UTC_ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

function parseUtcQuery(value: unknown, name: string): Date {
  if (typeof value !== 'string' || !UTC_ISO_DATETIME.test(value)) {
    throw new ValidationError(`${name} must be an ISO-8601 UTC datetime ending in Z`);
  }
  const date = new Date(value);
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const hour = Number(value.slice(11, 13));
  const minute = Number(value.slice(14, 16));
  const second = Number(value.slice(17, 19));
  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    hour > 23 || minute > 59 || second > 59
  ) {
    throw new ValidationError(`${name} must be a valid ISO-8601 UTC datetime`);
  }
  return date;
}

export async function getDashboardOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const from = parseUtcQuery(req.query.from, 'from');
    const to = parseUtcQuery(req.query.to, 'to');
    const duration = to.getTime() - from.getTime();
    if (duration <= 0) throw new ValidationError('to must be later than from');
    if (duration > MAX_WINDOW_MS) throw new ValidationError('Date range must not exceed 31 days');

    res.json(await dashboardService.getOverview(from, to, req.user?.id));
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    next(error);
  }
}

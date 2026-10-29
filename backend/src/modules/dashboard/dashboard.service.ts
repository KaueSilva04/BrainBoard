import { prisma } from '../../prisma.js';
import { calendarService } from '../calendar/calendar.service.js';
import type { DashboardOverviewDto } from './dashboard.types.js';

const DEFAULT_PROJECT_LIMIT = 6;
const DEFAULT_FOCUS_TASK_LIMIT = 8;
const DEFAULT_EVENT_LIMIT = 8;

function configuredLimit(envName: string, fallback: number, maximum: number): number {
  const value = process.env[envName];
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

async function resolveEffectiveUserId(userId?: string): Promise<string | undefined> {
  if (userId) return userId;
  const allowAnonymous = process.env.ALLOW_ANONYMOUS_DEV === 'true';
  if (allowAnonymous) {
    const defaultEmail = (process.env.DEFAULT_OWNER_EMAIL || 'admin@brainboard.local').toLowerCase().trim();
    const admin = await prisma.user.findFirst({
      where: { email: defaultEmail },
      select: { id: true },
    });
    return admin?.id;
  }
  return undefined;
}

export class DashboardService {
  async getOverview(from: Date, to: Date, userId?: string): Promise<DashboardOverviewDto> {
    const effectiveUserId = await resolveEffectiveUserId(userId);
    if (!effectiveUserId) {
      return {
        asOf: new Date().toISOString(),
        window: { from: from.toISOString(), to: to.toISOString() },
        projectCounts: { total: 0, planning: 0, active: 0, completed: 0 },
        projects: [],
        focusTasks: [],
        upcomingEvents: [],
      };
    }

    const projectWhere: any = {
      OR: [
        { ownerId: effectiveUserId },
        { collaborators: { some: { userId: effectiveUserId } } },
      ],
    };

    const [projectGroups, projects, focusTasks, calendarEvents] = await Promise.all([
      prisma.project.groupBy({
        by: ['status'],
        where: projectWhere,
        _count: { _all: true },
      }),
      prisma.project.findMany({
        where: projectWhere,
        select: { id: true, title: true, status: true, type: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: configuredLimit('DASHBOARD_PROJECT_LIMIT', DEFAULT_PROJECT_LIMIT, 20),
      }),
      prisma.task.findMany({
        where: {
          isSprintActive: true,
          ...(effectiveUserId
            ? {
                stage: {
                  project: projectWhere,
                },
              }
            : {}),
        },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          stage: {
            select: {
              id: true,
              title: true,
              project: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        take: configuredLimit('DASHBOARD_FOCUS_TASK_LIMIT', DEFAULT_FOCUS_TASK_LIMIT, 30),
      }),
      calendarService.getCalendarEvents({
        startDate: from,
        endDate: to,
        includeCompleted: false,
        userId: effectiveUserId,
      }),
    ]);

    const projectCounts = { total: 0, planning: 0, active: 0, completed: 0 };
    for (const group of projectGroups) {
      const count = group._count._all;
      projectCounts.total += count;
      if (group.status === 'PLANNING') projectCounts.planning = count;
      else if (group.status === 'ACTIVE') projectCounts.active = count;
      else if (group.status === 'COMPLETED') projectCounts.completed = count;
    }

    return {
      asOf: new Date().toISOString(),
      window: { from: from.toISOString(), to: to.toISOString() },
      projectCounts,
      projects,
      focusTasks: focusTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: task.dueDate?.toISOString() ?? null,
        project: task.stage.project,
        stage: { id: task.stage.id, title: task.stage.title },
      })),
      upcomingEvents: calendarEvents.slice(0, configuredLimit('DASHBOARD_EVENT_LIMIT', DEFAULT_EVENT_LIMIT, 30)),
    };
  }
}

export const dashboardService = new DashboardService();

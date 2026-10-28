import type { CalendarEventProjection } from '../calendar/calendar.types.js';

export interface DashboardWindow {
  from: string;
  to: string;
}

export interface DashboardProjectCounts {
  total: number;
  planning: number;
  active: number;
  completed: number;
}

export interface DashboardProjectProjection {
  id: string;
  title: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  type: string;
}

export interface DashboardFocusTaskProjection {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate: string | null;
  project: { id: string; title: string };
  stage: { id: string; title: string };
}

export interface DashboardOverviewDto {
  asOf: string;
  window: DashboardWindow;
  projectCounts: DashboardProjectCounts;
  projects: DashboardProjectProjection[];
  focusTasks: DashboardFocusTaskProjection[];
  upcomingEvents: CalendarEventProjection[];
}

export type { CalendarEventProjection };

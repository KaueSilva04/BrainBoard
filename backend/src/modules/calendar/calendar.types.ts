export interface CreateAppointmentInput {
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  description?: string | null | undefined;
  locationOrLink?: string | null | undefined;
}

export interface UpdateAppointmentInput {
  title?: string | undefined;
  startTime?: Date | string | undefined;
  endTime?: Date | string | undefined;
  description?: string | null | undefined;
  locationOrLink?: string | null | undefined;
  isCompleted?: boolean | undefined;
}

export interface AppointmentFilterOptions {
  startDate?: Date | string | undefined;
  endDate?: Date | string | undefined;
  isCompleted?: boolean | undefined;
}

export interface CalendarEventProjection {
  id: string;
  sourceId: string;
  sourceType: 'APPOINTMENT' | 'TASK_DEADLINE' | 'ACADEMIC_ASSIGNMENT';
  title: string;
  description: string | null;
  start: string; // ISO-8601 string
  end: string;   // ISO-8601 string
  locationOrLink?: string | null;
  isCompleted: boolean;
  color: string;
  projectTitle?: string;
  stageTitle?: string;
  projectType?: string;
  status?: string;
}

export interface CalendarFilterOptions {
  startDate?: Date | string | undefined;
  endDate?: Date | string | undefined;
  includeCompleted?: boolean | undefined;
  projectId?: string | undefined;
  subjectId?: string | undefined;
}

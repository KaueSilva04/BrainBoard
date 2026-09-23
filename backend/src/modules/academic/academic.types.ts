export interface AcademicDeadlineItem {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate: string; // ISO String
  daysRemaining: number;
  isOverdue: boolean;
  subjectId: string;
  subjectTitle: string;
  stageId: string;
  stageTitle: string;
}

export interface CreateAcademicSubjectInput {
  title: string;
  description?: string | null | undefined;
  businessLogic?: string | null | undefined;
  settings?: any | undefined;
}

export interface CreateAcademicDeadlineInput {
  stageId: string;
  title: string;
  description?: string | null | undefined;
  dueDate: string | Date;
}

export interface UpdateAcademicDeadlineInput {
  title?: string | undefined;
  description?: string | null | undefined;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | undefined;
  dueDate?: string | Date | null | undefined;
}

export interface AcademicDeadlineFilters {
  projectId?: string | undefined;
  includeCompleted?: boolean | undefined;
  days?: number | undefined;
}

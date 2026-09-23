import { AcademicTermStatus, AssignmentType, AssignmentStatus } from '@prisma/client';

export interface CreateAcademicTermInput {
  title: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: AcademicTermStatus;
}

export interface UpdateAcademicTermInput {
  title?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: AcademicTermStatus;
}

export interface CreateAcademicSubjectInput {
  termId: string;
  title: string;
  description?: string | null;
  professor?: string | null;
  colorCode?: string | null;
}

export interface UpdateAcademicSubjectInput {
  title?: string;
  description?: string | null;
  professor?: string | null;
  colorCode?: string | null;
}

export interface CreateAcademicAssignmentInput {
  subjectId: string;
  title: string;
  description?: string | null;
  dueDate?: string | Date | null;
  type?: AssignmentType;
  status?: AssignmentStatus;
  grade?: number | null;
}

export interface UpdateAcademicAssignmentInput {
  title?: string;
  description?: string | null;
  dueDate?: string | Date | null;
  type?: AssignmentType;
  status?: AssignmentStatus;
  grade?: number | null;
}

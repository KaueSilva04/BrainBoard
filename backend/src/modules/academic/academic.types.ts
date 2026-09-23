import { AssignmentType, AssignmentStatus } from '@prisma/client';

export interface CreateAcademicSubjectInput {
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

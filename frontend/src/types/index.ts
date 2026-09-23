// ============================================================
// BrainBoard V2 — Domain Types
// ============================================================

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';
export type StageStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type ProjectType = 'SOFTWARE';
export type SprintStatus = 'ACTIVE' | 'COMPLETED' | 'PLANNING';
export type ActiveView = 'PROJECTS' | 'BOARD' | 'SPRINT' | 'PROJECT_SPRINT' | 'ACADEMIC' | 'CALENDAR';

export type AssignmentType = 'EXAM' | 'HOMEWORK' | 'PROJECT' | 'PRESENTATION' | 'READING' | 'OTHER';
export type AssignmentStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface AcademicAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  type: AssignmentType;
  status: AssignmentStatus;
  grade: number | null;
  subjectId: string;
  subject?: AcademicSubject;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSubject {
  id: string;
  title: string;
  description: string | null;
  professor: string | null;
  colorCode: string | null;
  assignments?: AcademicAssignment[];
  createdAt: string;
  updatedAt: string;
}


// ---- Sprint ------------------------------------------------
export interface Sprint {
  id: string;
  title: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  projectId: string;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

// ---- Subtask -----------------------------------------------
export interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  taskId: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Task --------------------------------------------------
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  stageId: string;
  dueDate?: string | null;
  isSprintActive?: boolean | null;
  subtasks: Subtask[];
  stage?: Stage;
  createdAt: string;
  updatedAt: string;
}

// ---- Stage (Milestone) -------------------------------------
export interface Stage {
  id: string;
  title: string;
  order: number;
  status: StageStatus;
  projectId: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

// ---- Member ------------------------------------------------
export interface Member {
  id: string;
  name: string;
  role: string;
  email: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// ---- UpdateLog ---------------------------------------------
export interface UpdateLog {
  id: string;
  title: string;
  content: string;
  author: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Project (full — with relations) -----------------------
export interface Project {
  id: string;
  title: string;
  description: string | null;
  businessLogic: string | null;
  status: ProjectStatus;
  type?: ProjectType;
  githubRepo: string | null;
  settings: Record<string, unknown> | null;
  stages: Stage[];
  sprints: Sprint[];
  updateLogs: UpdateLog[];
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

// ---- Project (list item — without heavy relations) ---------
export interface ProjectSummary {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  type?: ProjectType;
  githubRepo: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stages: number;
    members: number;
    updateLogs: number;
  };
}

// ---- Input types -------------------------------------------
export interface CreateProjectInput {
  title: string;
  description?: string;
  businessLogic?: string;
  status?: ProjectStatus;
  type?: ProjectType;
  githubRepo?: string;
  settings?: Record<string, unknown>;
}

// DRY: todos os campos de criação são opcionais na atualização
export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface CreateStageInput {
  title: string;
  order?: number;
  status?: StageStatus;
}

export type UpdateStageInput = Partial<CreateStageInput>;

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string | null;
  isSprintActive?: boolean;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  stageId?: string;
  dueDate?: string | null;
  isSprintActive?: boolean;
}

export interface UpdateTaskStatusInput {
  status: TaskStatus;
}

export interface CreateMemberInput {
  name: string;
  role: string;
  email?: string;
}

export interface CreateUpdateLogInput {
  title: string;
  content: string;
  author?: string;
}

// ---- Appointment Domain Types -----------------------------
export interface Appointment {
  id: string;
  title: string;
  description: string | null;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  locationOrLink: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  title: string;
  startTime: string;
  endTime: string;
  description?: string | null;
  locationOrLink?: string | null;
}

export interface UpdateAppointmentInput {
  title?: string;
  startTime?: string;
  endTime?: string;
  description?: string | null;
  locationOrLink?: string | null;
  isCompleted?: boolean;
}

// ---- Unified Calendar Event Projection --------------------
export interface CalendarEventProjection {
  id: string;
  sourceId: string;
  sourceType: 'APPOINTMENT' | 'TASK_DEADLINE';
  title: string;
  description: string | null;
  start: string; // ISO string
  end: string;   // ISO string
  locationOrLink?: string | null;
  isCompleted: boolean;
  color: string;
  projectTitle?: string;
  stageTitle?: string;
  projectType?: string;
  status?: string;
}

// ---- Academic UI Types -------------------------------------
export interface CreateAcademicSubjectInput {
  title: string;
  description?: string;
  professor?: string;
  colorCode?: string;
}

export interface CreateAcademicAssignmentInput {
  title: string;
  description?: string;
  dueDate?: string;
  type?: AssignmentType;
  status?: AssignmentStatus;
  grade?: number;
  subjectId: string;
}

export interface UpdateAcademicAssignmentInput {
  title?: string;
  description?: string;
  dueDate?: string;
  type?: AssignmentType;
  status?: AssignmentStatus;
  grade?: number;
}

// ---- UI helpers --------------------------------------------
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planejamento',
  ACTIVE: 'Em Andamento',
  COMPLETED: 'Concluído',
};

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluído',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Andamento',
  DONE: 'Concluído',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNING: 'bg-amber-100 text-amber-700 border-amber-200',
  ACTIVE: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const STAGE_STATUS_COLORS: Record<StageStatus, string> = {
  PLANNING: 'bg-slate-100 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

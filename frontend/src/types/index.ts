// ============================================================
// BrainBoard V2 — Domain Types
// ============================================================

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';
export type StageStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type ProjectType = 'SOFTWARE';
export type SprintStatus = 'ACTIVE' | 'COMPLETED' | 'PLANNING';
export type ActiveView = 'OVERVIEW' | 'PROJECTS' | 'BOARD' | 'SPRINT' | 'PROJECT_SPRINT' | 'ACADEMIC' | 'CALENDAR';
export type ProjectMemberRole = 'OWNER' | 'COLLABORATOR';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarColor?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  avatarColor?: string;
}

export interface ProjectCollaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarColor?: string | null;
  role: ProjectMemberRole;
  isOwner: boolean;
  joinedAt?: string;
}

export interface ProjectCollaboratorRelation {
  id: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt?: string;
  user: AuthUser;
}

export interface DashboardOverviewDto {
  asOf: string;
  window: { from: string; to: string };
  projectCounts: { total: number; planning: number; active: number; completed: number };
  projects: Array<{ id: string; title: string; status: ProjectStatus; type?: ProjectType }>;
  focusTasks: Array<{
    id: string; title: string; status: TaskStatus; dueDate: string | null;
    project: { id: string; title: string }; stage: { id: string; title: string };
    assigneeId?: string | null;
    assignee?: AuthUser | null;
  }>;
  upcomingEvents: CalendarEventProjection[];
}

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
  tags?: string[];
  stageId: string;
  dueDate?: string | null;
  isSprintActive?: boolean | null;
  assigneeId?: string | null;
  assignee?: AuthUser | null;
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
  ownerId?: string | null;
  owner?: AuthUser | null;
  collaborators?: ProjectCollaboratorRelation[];
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
  ownerId?: string | null;
  owner?: AuthUser | null;
  collaborators?: ProjectCollaboratorRelation[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    stages: number;
    members: number;
    updateLogs: number;
    collaborators?: number;
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
  tags?: string[];
  dueDate?: string | null;
  isSprintActive?: boolean;
  assigneeId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  tags?: string[];
  stageId?: string;
  dueDate?: string | null;
  isSprintActive?: boolean;
  assigneeId?: string | null;
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
  sourceType: 'APPOINTMENT' | 'TASK_DEADLINE' | 'ACADEMIC_ASSIGNMENT';
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

export const PRESET_TASK_TAGS: string[] = [
  'Frontend',
  'Backend',
  'Bug',
  'Feature',
  'Urgente',
  'Design',
  'Docs',
  'Teste',
];

export function getTagBadgeClasses(tag: string): string {
  const clean = tag.replace(/^#/, '').toLowerCase();
  if (clean.includes('bug') || clean.includes('erro') || clean.includes('urgent')) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70';
  }
  if (clean.includes('front') || clean.includes('ui') || clean.includes('design')) {
    return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70';
  }
  if (clean.includes('back') || clean.includes('api') || clean.includes('banco')) {
    return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/70';
  }
  if (clean.includes('feat') || clean.includes('novo') || clean.includes('melhoria')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70';
  }
  if (clean.includes('test') || clean.includes('qa') || clean.includes('doc')) {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70';
  }
  return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70';
}

export function getTaskTags(task: { tags?: string[] | null; title?: string; description?: string | null }): string[] {
  const result = new Set<string>();
  if (Array.isArray(task.tags)) {
    task.tags.forEach((t) => {
      const trimmed = String(t).trim().replace(/^#/, '');
      if (trimmed) result.add(trimmed);
    });
  }
  return Array.from(result);
}

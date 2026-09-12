// ============================================================
// BrainBoard V2 — Domain Types
// ============================================================

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';
export type StageStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

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
  subtasks: Subtask[];
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
  githubRepo: string | null;
  settings: Record<string, unknown> | null;
  stages: Stage[];
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

import type {
  Project,
  Stage,
  UpdateLog,
  Member,
  Task,
  Subtask,
  ProjectStatus,
  StageStatus,
  Status,
  ProjectType,
  ProjectMemberRole,
} from '@prisma/client';

export type {
  Project,
  Stage,
  UpdateLog,
  Member,
  Task,
  Subtask,
  ProjectStatus,
  StageStatus,
  Status,
  ProjectType,
  ProjectMemberRole,
};

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarColor: string | null;
}

export interface ProjectMemberSummary {
  id: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: Date | string;
  user: UserSummary;
}

export interface CreateProjectInput {
  title: string;
  description?: string | null | undefined;
  businessLogic?: string | null | undefined;
  status?: string | undefined;
  type?: ProjectType | string | undefined;
  githubRepo?: string | null | undefined;
  settings?: any | undefined;
  ownerId?: string | null | undefined;
}

export interface UpdateProjectInput {
  title?: string | undefined;
  description?: string | null | undefined;
  businessLogic?: string | null | undefined;
  status?: string | undefined;
  type?: ProjectType | string | undefined;
  githubRepo?: string | null | undefined;
  settings?: any | undefined;
}

export interface ProjectFilterOptions {
  status?: string | undefined;
  type?: ProjectType | string | undefined;
  userId?: string | undefined;
}

export type ProjectWithDetails = Project & {
  owner?: UserSummary | null;
  collaborators?: ProjectMemberSummary[];
  stages: (Stage & { tasks: (Task & { subtasks: Subtask[]; assignee?: UserSummary | null })[] })[];
  updateLogs: UpdateLog[];
  members: Member[];
};

export interface CreateStageInput {
  projectId: string;
  title: string;
  status?: string | undefined;
  order?: number | undefined;
}

export interface UpdateStageInput {
  title?: string | undefined;
  status?: string | undefined;
  order?: number | undefined;
}

export type StageWithTasks = Stage & {
  tasks: (Task & { subtasks: Subtask[]; assignee?: UserSummary | null })[];
};

export interface CreateTaskInput {
  stageId: string;
  title: string;
  description?: string | null | undefined;
  status?: string | undefined;
  tags?: string[] | undefined;
  dueDate?: Date | string | null | undefined;
  isSprintActive?: boolean | undefined;
  assigneeId?: string | null | undefined;
}

export interface UpdateTaskInput {
  stageId?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  status?: string | undefined;
  tags?: string[] | undefined;
  dueDate?: Date | string | null | undefined;
  isSprintActive?: boolean | undefined;
  assigneeId?: string | null | undefined;
}

export interface TaskFilterOptions {
  stageId?: string | undefined;
  projectId?: string | undefined;
  status?: string | undefined;
  tag?: string | undefined;
  isSprintActive?: boolean | undefined;
  hasDueDate?: boolean | undefined;
  userId?: string | undefined;
}

export type TaskWithSubtasks = Task & {
  subtasks: Subtask[];
  stage?: Stage;
  assignee?: UserSummary | null;
};

export interface CreateMemberInput {
  projectId: string;
  name: string;
  role: string;
  email?: string | null | undefined;
}

export interface UpdateMemberInput {
  name?: string | undefined;
  role?: string | undefined;
  email?: string | null | undefined;
}

export interface CreateLogInput {
  projectId: string;
  title: string;
  content: string;
  author?: string | undefined;
}

export interface LogFilterOptions {
  projectId?: string | undefined;
}

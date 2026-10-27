import type {
  Project,
  ProjectSummary,
  Stage,
  Task,
  Subtask,
  Member,
  UpdateLog,
  CreateProjectInput,
  UpdateProjectInput,
  CreateStageInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateMemberInput,
  CreateUpdateLogInput,
  TaskStatus,
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  CalendarEventProjection,
  DashboardOverviewDto,
  AuthUser,
  AuthResponse,
  LoginInput,
  RegisterInput,
  ProjectCollaborator,
  ProjectMemberRole,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

// ---- Token Storage -----------------------------------------
let currentAuthToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('brainboard_token') : null;

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('brainboard_token', token);
    } else {
      localStorage.removeItem('brainboard_token');
    }
  }
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

// ---- Custom error class ------------------------------------
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---- Generic fetch helper with timeout ---------------------
async function request<T>(path: string, options?: RequestInit, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401 && !path.startsWith('/api/auth/login') && !path.startsWith('/api/auth/register')) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('brainboard:unauthorized'));
        }
      }
      const body = await res.text().catch(() => '');
      let message: string;
      try { message = JSON.parse(body)?.error ?? body; } catch { message = body || res.statusText; }
      throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// Projects API
// ============================================================
export const projectsApi = {
  list(): Promise<ProjectSummary[]> {
    return request('/api/projects');
  },

  get(id: string): Promise<Project> {
    return request(`/api/projects/${id}`);
  },

  create(input: CreateProjectInput): Promise<Project> {
    return request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: UpdateProjectInput): Promise<Project> {
    return request(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  updateBusinessLogic(id: string, businessLogic: string): Promise<Project> {
    return request(`/api/projects/${id}/business-logic`, {
      method: 'PATCH',
      body: JSON.stringify({ businessLogic }),
    });
  },

  updateSettings(
    id: string,
    settings: { githubRepo?: string; settings?: Record<string, unknown> }
  ): Promise<Project> {
    return request(`/api/projects/${id}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/api/projects/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Stages API
// ============================================================
export const stagesApi = {
  list(projectId: string): Promise<Stage[]> {
    return request(`/api/projects/${projectId}/stages`);
  },

  create(projectId: string, input: CreateStageInput): Promise<Stage> {
    return request(`/api/projects/${projectId}/stages`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(
    projectId: string,
    stageId: string,
    input: Partial<CreateStageInput>
  ): Promise<Stage> {
    return request(`/api/projects/${projectId}/stages/${stageId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  delete(projectId: string, stageId: string): Promise<void> {
    return request(`/api/projects/${projectId}/stages/${stageId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================
// Tasks API
// ============================================================
export const tasksApi = {
  list(stageId: string): Promise<Task[]> {
    return request(`/api/stages/${stageId}/tasks`);
  },

  listAll(filters?: {
    isSprintActive?: boolean;
    status?: TaskStatus;
    hasDueDate?: boolean;
    stageId?: string;
    projectId?: string;
  }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.isSprintActive !== undefined) params.set('isSprintActive', String(filters.isSprintActive));
    if (filters?.status) params.set('status', filters.status);
    if (filters?.hasDueDate !== undefined) params.set('hasDueDate', String(filters.hasDueDate));
    if (filters?.stageId) params.set('stageId', filters.stageId);
    if (filters?.projectId) params.set('projectId', filters.projectId);
    const qs = params.toString();
    return request(`/api/tasks${qs ? `?${qs}` : ''}`);
  },

  create(stageId: string, input: CreateTaskInput): Promise<Task> {
    return request(`/api/stages/${stageId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: UpdateTaskInput): Promise<Task> {
    return request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  toggleSprint(id: string, isSprintActive: boolean): Promise<Task> {
    return request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isSprintActive }),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  addSubtask(taskId: string, title: string): Promise<Subtask> {
    return request<Subtask>(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  toggleSubtask(subtaskId: string, isDone: boolean): Promise<Subtask> {
    return request<Subtask>(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDone }),
    });
  },

  deleteSubtask(subtaskId: string): Promise<void> {
    return request(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
  },
};

// ============================================================
// Sprints API
// ============================================================
export const sprintsApi = {
  list(projectId: string): Promise<import('../types').Sprint[]> {
    return request(`/api/projects/${projectId}/sprints`);
  },

  create(projectId: string, input: { title: string; goal?: string; startDate?: string; endDate?: string }): Promise<import('../types').Sprint> {
    return request(`/api/projects/${projectId}/sprints`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(sprintId: string, input: { title?: string; goal?: string; status?: import('../types').SprintStatus; startDate?: string; endDate?: string }): Promise<import('../types').Sprint> {
    return request(`/api/sprints/${sprintId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  delete(sprintId: string): Promise<void> {
    return request(`/api/sprints/${sprintId}`, { method: 'DELETE' });
  },
};

// ============================================================
// Members API
// ============================================================
export const membersApi = {
  list(projectId: string): Promise<Member[]> {
    return request(`/api/projects/${projectId}/members`);
  },

  create(projectId: string, input: CreateMemberInput): Promise<Member> {
    return request(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  delete(projectId: string, memberId: string): Promise<void> {
    return request(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================
// Update Logs API
// ============================================================
export const updateLogsApi = {
  list(projectId: string): Promise<UpdateLog[]> {
    return request(`/api/projects/${projectId}/update-logs`);
  },

  create(projectId: string, input: CreateUpdateLogInput): Promise<UpdateLog> {
    return request(`/api/projects/${projectId}/update-logs`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  delete(projectId: string, logId: string): Promise<void> {
    return request(`/api/projects/${projectId}/update-logs/${logId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================================
// Appointments API
// ============================================================
export const appointmentsApi = {
  list(filters?: { startDate?: string; endDate?: string; isCompleted?: boolean }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.isCompleted !== undefined) params.set('isCompleted', String(filters.isCompleted));
    const qs = params.toString();
    return request(`/api/appointments${qs ? `?${qs}` : ''}`);
  },

  get(id: string): Promise<Appointment> {
    return request(`/api/appointments/${id}`);
  },

  create(input: CreateAppointmentInput): Promise<Appointment> {
    return request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
    return request(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  toggleCompleted(id: string, isCompleted: boolean): Promise<Appointment> {
    return request(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted }),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/api/appointments/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Calendar API
// ============================================================
export const calendarApi = {
  getEvents(filters?: {
    startDate?: string;
    endDate?: string;
    includeCompleted?: boolean;
    projectId?: string;
  }): Promise<CalendarEventProjection[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.includeCompleted !== undefined) params.set('includeCompleted', String(filters.includeCompleted));
    if (filters?.projectId) params.set('projectId', filters.projectId);
    const qs = params.toString();
    return request(`/api/calendar/events${qs ? `?${qs}` : ''}`);
  },
};

export const dashboardApi = {
  getOverview(from: string, to: string): Promise<DashboardOverviewDto> {
    const params = new URLSearchParams({ from, to });
    return request(`/api/dashboard/overview?${params.toString()}`);
  },
};

// ============================================================
// Academic API
// ============================================================
export const academicApi = {
  // Subjects
  listSubjects(): Promise<import('../types').AcademicSubject[]> {
    return request('/api/academic/subjects');
  },
  createSubject(input: import('../types').CreateAcademicSubjectInput): Promise<import('../types').AcademicSubject> {
    return request('/api/academic/subjects', { method: 'POST', body: JSON.stringify(input) });
  },
  deleteSubject(id: string): Promise<void> {
    return request(`/api/academic/subjects/${id}`, { method: 'DELETE' });
  },

  // Assignments
  listAssignments(subjectId?: string): Promise<import('../types').AcademicAssignment[]> {
    const qs = subjectId ? `?subjectId=${subjectId}` : '';
    return request(`/api/academic/assignments${qs}`);
  },
  createAssignment(input: import('../types').CreateAcademicAssignmentInput): Promise<import('../types').AcademicAssignment> {
    return request('/api/academic/assignments', { method: 'POST', body: JSON.stringify(input) });
  },
  updateAssignment(id: string, input: import('../types').UpdateAcademicAssignmentInput): Promise<import('../types').AcademicAssignment> {
    return request(`/api/academic/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  deleteAssignment(id: string): Promise<void> {
    return request(`/api/academic/assignments/${id}`, { method: 'DELETE' });
  },
};

// ============================================================
// Auth API
// ============================================================
export const authApi = {
  login(input: LoginInput): Promise<AuthResponse> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  register(input: RegisterInput): Promise<AuthResponse> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  me(): Promise<{ user: AuthUser }> {
    return request('/api/auth/me');
  },

  logout(): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/logout', {
      method: 'POST',
    });
  },

  mcpToken(): Promise<{ token: string; expiresIn: string; user: AuthUser }> {
    return request('/api/auth/mcp-token', {
      method: 'POST',
    });
  },
};

// ============================================================
// Users API
// ============================================================
export const usersApi = {
  search(query: string, limit = 10): Promise<AuthUser[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    return request(`/api/users/search?${params.toString()}`);
  },
};

// ============================================================
// Project Collaborators API
// ============================================================
export const collaboratorsApi = {
  list(projectId: string): Promise<ProjectCollaborator[]> {
    return request(`/api/projects/${projectId}/collaborators`);
  },

  add(
    projectId: string,
    input: { userId?: string; email?: string; role?: ProjectMemberRole }
  ): Promise<ProjectCollaborator> {
    return request(`/api/projects/${projectId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  remove(projectId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/projects/${projectId}/collaborators/${userId}`, {
      method: 'DELETE',
    });
  },
};

export const projectCollaboratorsApi = collaboratorsApi;

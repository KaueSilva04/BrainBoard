import type {
  Project,
  ProjectSummary,
  Stage,
  Task,
  Member,
  UpdateLog,
  CreateProjectInput,
  UpdateProjectInput,
  CreateStageInput,
  CreateTaskInput,
  CreateMemberInput,
  CreateUpdateLogInput,
  TaskStatus,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';

// ---- Generic fetch helper ----------------------------------
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let message: string;
    try {
      message = JSON.parse(body)?.error ?? body;
    } catch {
      message = body || res.statusText;
    }
    throw new Error(`[${res.status}] ${message}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
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

  create(stageId: string, input: CreateTaskInput): Promise<Task> {
    return request(`/api/stages/${stageId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return request(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  addSubtask(taskId: string, title: string) {
    return request(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  toggleSubtask(subtaskId: string, isDone?: boolean) {
    return request(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      body: JSON.stringify(isDone !== undefined ? { isDone } : {}),
    });
  },

  deleteSubtask(subtaskId: string): Promise<void> {
    return request(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
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

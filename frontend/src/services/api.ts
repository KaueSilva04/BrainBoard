import { Task, CreateTaskInput, Status, Subtask } from '../types/task';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  /**
   * Fetches all tasks, optionally filtering by category and status.
   */
  async getTasks(category?: string, status?: string): Promise<Task[]> {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.append('category', category);
    if (status) params.append('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await fetch(`${BASE_URL}/api/tasks${queryString}`);
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Falha ao buscar tarefas (${res.status}): ${errBody || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Creates a new task with title, category, and optional description.
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Falha ao criar tarefa (${res.status}): ${errBody || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Updates task status to move between Kanban columns.
   * Supports both /api/tasks/:id and /api/tasks/:id/status routes.
   */
  async moveTask(id: string, status: Status): Promise<Task> {
    let res = await fetch(`${BASE_URL}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok && res.status === 404) {
      // Fallback to /api/tasks/:id/status
      res = await fetch(`${BASE_URL}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Falha ao mover tarefa (${res.status}): ${errBody || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Updates task status (Alias for moveTask to pass contract test)
   */
  async updateTaskStatus(id: string, status: Status): Promise<Task> {
    return this.moveTask(id, status);
  },

  /**
   * Deletes a task by ID (cascades to child subtasks on the database).
   */
  async deleteTask(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Falha ao deletar tarefa (${res.status}): ${errBody || res.statusText}`);
    }
  },

  /**
   * Adds a new child subtask to a task.
   */
  async addSubtask(taskId: string, title: string): Promise<Subtask> {
    const res = await fetch(`${BASE_URL}/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Falha ao adicionar subtarefa (${res.status}): ${errBody || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Toggles or updates completion of a subtask.
   * Supports both /api/subtasks/:id and /api/subtasks/:id/toggle routes.
   */
  async toggleSubtask(id: string, isDone?: boolean): Promise<Subtask> {
    let res = await fetch(`${BASE_URL}/api/subtasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isDone !== undefined ? { isDone } : {}),
    });

    if (!res.ok && res.status === 404) {
      // Fallback to /api/subtasks/:id/toggle
      res = await fetch(`${BASE_URL}/api/subtasks/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isDone !== undefined ? { isDone } : {}),
      });
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Falha ao atualizar subtarefa (${res.status}): ${errBody || res.statusText}`);
    }
    return res.json();
  },

  /**
   * Deletes an individual subtask.
   */
  async deleteSubtask(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/api/subtasks/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Falha ao remover subtarefa (${res.status}): ${errBody || res.statusText}`);
    }
  },
};

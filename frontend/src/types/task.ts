export type Category = 'PROJECT' | 'COLLEGE' | 'PERSONAL';
export type Status = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  taskId: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  category: Category;
  status: Status;
  createdAt: string;
  updatedAt?: string;
  subtasks: Subtask[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category: Category;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  category?: Category;
  status?: Status;
}

export type CategoryFilter = 'ALL' | Category;

export const CATEGORY_LABELS: Record<Category, string> = {
  PROJECT: 'Projetos',
  COLLEGE: 'Faculdade',
  PERSONAL: 'Pessoais',
};

export const STATUS_LABELS: Record<Status, string> = {
  TODO: 'A Fazer',
  IN_PROGRESS: 'Em Andamento',
  DONE: 'Concluído',
};

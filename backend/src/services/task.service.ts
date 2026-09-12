import { Category, Status } from '@prisma/client';
import type { Task, Subtask } from '@prisma/client';
import { prisma } from '../prisma.js';
import { ValidationError, NotFoundError } from './errors.js';

export const VALID_CATEGORIES: Category[] = ['PROJECT', 'COLLEGE', 'PERSONAL'];
export const VALID_STATUSES: Status[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export interface CreateTaskInput {
  title: string;
  category: string;
  description?: string | null | undefined;
}

export interface UpdateTaskInput {
  status?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  category?: string | undefined;
}

export interface TaskFilterOptions {
  category?: string | undefined;
  status?: string | undefined;
}

export type TaskWithSubtasks = Task & { subtasks: Subtask[] };

export class TaskService {
  async listTasks(filters?: TaskFilterOptions): Promise<TaskWithSubtasks[]> {
    const where: { category?: Category; status?: Status } = {};

    if (filters?.category) {
      if (!VALID_CATEGORIES.includes(filters.category as Category)) {
        throw new ValidationError(`Invalid category: ${filters.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
      where.category = filters.category as Category;
    }

    if (filters?.status) {
      if (!VALID_STATUSES.includes(filters.status as Status)) {
        throw new ValidationError(`Invalid status: ${filters.status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }
      where.status = filters.status as Status;
    }

    return await prisma.task.findMany({
      where,
      include: { subtasks: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskById(id: string): Promise<TaskWithSubtasks | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Task ID is required');
    }

    return await prisma.task.findUnique({
      where: { id },
      include: { subtasks: true },
    });
  }

  async createTask(data: CreateTaskInput): Promise<TaskWithSubtasks> {
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    if (!data.category || !VALID_CATEGORIES.includes(data.category as Category)) {
      throw new ValidationError(`Valid category (${VALID_CATEGORIES.join(', ')}) is required`);
    }

    return await prisma.task.create({
      data: {
        title: data.title.trim(),
        category: data.category as Category,
        description: data.description !== undefined && data.description !== null ? String(data.description).trim() : null,
      },
      include: { subtasks: true },
    });
  }

  async updateTask(id: string, data: UpdateTaskInput): Promise<TaskWithSubtasks> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Task ID is required');
    }

    const updateData: {
      status?: Status;
      title?: string;
      description?: string | null;
      category?: Category;
    } = {};

    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status as Status)) {
        throw new ValidationError(`Invalid status: ${data.status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }
      updateData.status = data.status as Status;
    }

    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || !data.title.trim()) {
        throw new ValidationError('Title cannot be empty');
      }
      updateData.title = data.title.trim();
    }

    if (data.category !== undefined) {
      if (!VALID_CATEGORIES.includes(data.category as Category)) {
        throw new ValidationError(`Invalid category: ${data.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }
      updateData.category = data.category as Category;
    }

    if (data.description !== undefined) {
      updateData.description = data.description === null ? null : String(data.description).trim();
    }

    try {
      return await prisma.task.update({
        where: { id },
        data: updateData,
        include: { subtasks: true },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Task not found');
      }
      throw error;
    }
  }

  async deleteTask(id: string): Promise<Task> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Task ID is required');
    }

    try {
      return await prisma.task.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Task not found');
      }
      throw error;
    }
  }
}

export const taskService = new TaskService();

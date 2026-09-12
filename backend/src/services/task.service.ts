import { Status } from '@prisma/client';
import type { Task, Subtask, Stage } from '@prisma/client';
import { prisma } from '../prisma.js';
import { ValidationError, NotFoundError } from './errors.js';

export const VALID_STATUSES: Status[] = ['TODO', 'IN_PROGRESS', 'DONE'];

export interface CreateTaskInput {
  stageId: string;
  title: string;
  description?: string | null | undefined;
  status?: string | undefined;
}

export interface UpdateTaskInput {
  stageId?: string | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  status?: string | undefined;
}

export interface TaskFilterOptions {
  stageId?: string | undefined;
  status?: string | undefined;
}

export type TaskWithSubtasks = Task & { subtasks: Subtask[]; stage?: Stage };

export class TaskService {
  async listTasks(filters?: TaskFilterOptions): Promise<TaskWithSubtasks[]> {
    const where: { stageId?: string; status?: Status } = {};

    if (filters?.stageId) {
      where.stageId = filters.stageId;
    }

    if (filters?.status) {
      if (!VALID_STATUSES.includes(filters.status as Status)) {
        throw new ValidationError(
          `Invalid status: ${filters.status}. Must be one of: ${VALID_STATUSES.join(', ')}`
        );
      }
      where.status = filters.status as Status;
    }

    return await prisma.task.findMany({
      where,
      include: { subtasks: true, stage: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskById(id: string): Promise<TaskWithSubtasks | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Task ID is required');
    }

    return await prisma.task.findUnique({
      where: { id },
      include: { subtasks: true, stage: true },
    });
  }

  async createTask(data: CreateTaskInput): Promise<TaskWithSubtasks> {
    if (!data.stageId || typeof data.stageId !== 'string') {
      throw new ValidationError('Stage ID is required');
    }

    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    const stage = await prisma.stage.findUnique({
      where: { id: data.stageId },
      select: { id: true },
    });
    if (!stage) {
      throw new NotFoundError('Stage not found');
    }

    let status: Status = 'TODO';
    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status as Status)) {
        throw new ValidationError(
          `Invalid status: ${data.status}. Must be one of: ${VALID_STATUSES.join(', ')}`
        );
      }
      status = data.status as Status;
    }

    return await prisma.task.create({
      data: {
        stageId: data.stageId,
        title: data.title.trim(),
        description:
          data.description !== undefined && data.description !== null
            ? String(data.description).trim()
            : null,
        status,
      },
      include: { subtasks: true, stage: true },
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
      stageId?: string;
    } = {};

    if (data.status !== undefined) {
      if (!VALID_STATUSES.includes(data.status as Status)) {
        throw new ValidationError(
          `Invalid status: ${data.status}. Must be one of: ${VALID_STATUSES.join(', ')}`
        );
      }
      updateData.status = data.status as Status;
    }

    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || !data.title.trim()) {
        throw new ValidationError('Title cannot be empty');
      }
      updateData.title = data.title.trim();
    }

    if (data.stageId !== undefined) {
      if (typeof data.stageId !== 'string' || !data.stageId.trim()) {
        throw new ValidationError('Stage ID cannot be empty');
      }
      const stage = await prisma.stage.findUnique({
        where: { id: data.stageId },
        select: { id: true },
      });
      if (!stage) {
        throw new NotFoundError('Stage not found');
      }
      updateData.stageId = data.stageId;
    }

    if (data.description !== undefined) {
      updateData.description =
        data.description === null ? null : String(data.description).trim();
    }

    try {
      return await prisma.task.update({
        where: { id },
        data: updateData,
        include: { subtasks: true, stage: true },
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

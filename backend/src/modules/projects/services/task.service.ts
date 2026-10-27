import { Status } from '@prisma/client';
import type { Task } from '@prisma/client';
import { prisma } from '../../../prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import { validateTextEncoding } from '../../shared/text-encoding.js';
import { collaboratorService } from './collaborator.service.js';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterOptions,
  TaskWithSubtasks,
} from '../projects.types.js';

export const VALID_STATUSES: Status[] = ['TODO', 'IN_PROGRESS', 'DONE'];

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
};

export class TaskService {
  async listTasks(filters?: TaskFilterOptions): Promise<TaskWithSubtasks[]> {
    const where: any = {};

    if (filters?.stageId) {
      where.stageId = filters.stageId;
    }

    if (filters?.projectId) {
      where.stage = { ...where.stage, projectId: filters.projectId };
    }

    if (filters?.status) {
      if (!VALID_STATUSES.includes(filters.status as Status)) {
        throw new ValidationError(
          `Invalid status: ${filters.status}. Must be one of: ${VALID_STATUSES.join(', ')}`
        );
      }
      where.status = filters.status as Status;
    }

    if (filters?.isSprintActive !== undefined) {
      where.isSprintActive = Boolean(filters.isSprintActive);
    }

    if (filters?.hasDueDate === true) {
      where.dueDate = { not: null };
    }

    if (filters?.userId && !filters.projectId) {
      where.stage = {
        ...where.stage,
        project: {
          OR: [
            { ownerId: filters.userId },
            { collaborators: { some: { userId: filters.userId } } },
          ],
        },
      };
    }

    return await prisma.task.findMany({
      where,
      include: {
        subtasks: true,
        stage: true,
        assignee: { select: USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaskById(id: string): Promise<TaskWithSubtasks | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Task ID is required');
    }

    return await prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: true,
        stage: true,
        assignee: { select: USER_SELECT },
      },
    });
  }

  async createTask(data: CreateTaskInput): Promise<TaskWithSubtasks> {
    validateTextEncoding({ title: data.title, description: data.description });
    if (!data.stageId || typeof data.stageId !== 'string') {
      throw new ValidationError('Stage ID is required');
    }

    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    const stage = await prisma.stage.findUnique({
      where: { id: data.stageId },
      select: { id: true, projectId: true },
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

    let dueDate: Date | null = null;
    if (data.dueDate !== undefined && data.dueDate !== null) {
      const parsed = new Date(data.dueDate);
      if (isNaN(parsed.getTime())) {
        throw new ValidationError('Invalid dueDate format');
      }
      dueDate = parsed;
    }

    const isSprintActive = data.isSprintActive !== undefined ? Boolean(data.isSprintActive) : false;

    let assigneeId: string | null = null;
    if (data.assigneeId) {
      const isMember = await collaboratorService.isMemberOrOwner(stage.projectId, data.assigneeId);
      if (!isMember) {
        throw new ValidationError('O responsável deve ser membro ou proprietário do projeto');
      }
      assigneeId = data.assigneeId;
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
        dueDate,
        isSprintActive,
        assigneeId,
      },
      include: {
        subtasks: true,
        stage: true,
        assignee: { select: USER_SELECT },
      },
    });
  }

  async updateTask(id: string, data: UpdateTaskInput): Promise<TaskWithSubtasks> {
    validateTextEncoding({ title: data.title, description: data.description });
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Task ID is required');
    }

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { stage: { select: { projectId: true } } },
    });
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const updateData: {
      status?: Status;
      title?: string;
      description?: string | null;
      stageId?: string;
      dueDate?: Date | null;
      isSprintActive?: boolean;
      assigneeId?: string | null;
    } = {};

    let targetProjectId = existingTask.stage.projectId;

    if (data.stageId !== undefined) {
      if (typeof data.stageId !== 'string' || !data.stageId.trim()) {
        throw new ValidationError('Stage ID cannot be empty');
      }
      const stage = await prisma.stage.findUnique({
        where: { id: data.stageId },
        select: { id: true, projectId: true },
      });
      if (!stage) {
        throw new NotFoundError('Stage not found');
      }
      updateData.stageId = data.stageId;
      targetProjectId = stage.projectId;
    }

    if (data.assigneeId !== undefined) {
      if (data.assigneeId === null || data.assigneeId === '') {
        updateData.assigneeId = null;
      } else {
        const isMember = await collaboratorService.isMemberOrOwner(targetProjectId, data.assigneeId);
        if (!isMember) {
          throw new ValidationError('O responsável deve ser membro ou proprietário do projeto');
        }
        updateData.assigneeId = data.assigneeId;
      }
    }

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

    if (data.description !== undefined) {
      updateData.description =
        data.description === null ? null : String(data.description).trim();
    }

    if (data.dueDate !== undefined) {
      if (data.dueDate === null) {
        updateData.dueDate = null;
      } else {
        const parsed = new Date(data.dueDate);
        if (isNaN(parsed.getTime())) {
          throw new ValidationError('Invalid dueDate format');
        }
        updateData.dueDate = parsed;
      }
    }

    if (data.isSprintActive !== undefined) {
      updateData.isSprintActive = Boolean(data.isSprintActive);
    }

    try {
      return await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          subtasks: true,
          stage: true,
          assignee: { select: USER_SELECT },
        },
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

import { StageStatus } from '@prisma/client';
import type { Stage, Task, Subtask } from '@prisma/client';
import { prisma } from '../prisma.js';
import { ValidationError, NotFoundError } from './errors.js';

export const VALID_STAGE_STATUSES: StageStatus[] = ['PLANNING', 'IN_PROGRESS', 'COMPLETED'];

export interface CreateStageInput {
  projectId: string;
  title: string;
  order?: number | undefined;
  status?: string | undefined;
}

export interface UpdateStageInput {
  title?: string | undefined;
  order?: number | undefined;
  status?: string | undefined;
}

export type StageWithTasks = Stage & {
  tasks: (Task & { subtasks: Subtask[] })[];
};

export class StageService {
  async listStagesByProject(projectId: string): Promise<StageWithTasks[]> {
    if (!projectId || typeof projectId !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    return await prisma.stage.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: {
            subtasks: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
  }

  async getStageById(id: string): Promise<StageWithTasks | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Stage ID is required');
    }

    return await prisma.stage.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: {
            subtasks: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
  }

  async createStage(data: CreateStageInput): Promise<StageWithTasks> {
    if (!data.projectId || typeof data.projectId !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    let status: StageStatus = 'PLANNING';
    if (data.status !== undefined) {
      if (!VALID_STAGE_STATUSES.includes(data.status as StageStatus)) {
        throw new ValidationError(
          `Invalid stage status: ${data.status}. Must be one of: ${VALID_STAGE_STATUSES.join(', ')}`
        );
      }
      status = data.status as StageStatus;
    }

    let order = 0;
    if (data.order !== undefined && typeof data.order === 'number') {
      order = data.order;
    } else {
      const maxStage = await prisma.stage.findFirst({
        where: { projectId: data.projectId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = maxStage ? maxStage.order + 1 : 0;
    }

    return await prisma.stage.create({
      data: {
        projectId: data.projectId,
        title: data.title.trim(),
        order,
        status,
      },
      include: {
        tasks: {
          include: { subtasks: true },
        },
      },
    });
  }

  async updateStage(id: string, data: UpdateStageInput): Promise<StageWithTasks> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Stage ID is required');
    }

    const updateData: {
      title?: string;
      order?: number;
      status?: StageStatus;
    } = {};

    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || !data.title.trim()) {
        throw new ValidationError('Title cannot be empty');
      }
      updateData.title = data.title.trim();
    }

    if (data.order !== undefined) {
      if (typeof data.order !== 'number') {
        throw new ValidationError('Order must be a number');
      }
      updateData.order = data.order;
    }

    if (data.status !== undefined) {
      if (!VALID_STAGE_STATUSES.includes(data.status as StageStatus)) {
        throw new ValidationError(
          `Invalid stage status: ${data.status}. Must be one of: ${VALID_STAGE_STATUSES.join(', ')}`
        );
      }
      updateData.status = data.status as StageStatus;
    }

    try {
      return await prisma.stage.update({
        where: { id },
        data: updateData,
        include: {
          tasks: {
            include: { subtasks: true },
          },
        },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Stage not found');
      }
      throw error;
    }
  }

  async deleteStage(id: string): Promise<Stage> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Stage ID is required');
    }

    try {
      return await prisma.stage.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Stage not found');
      }
      throw error;
    }
  }
}

export const stageService = new StageService();

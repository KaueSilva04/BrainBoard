import type { UpdateLog } from '@prisma/client';
import { prisma } from '../../../prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import type { CreateLogInput } from '../projects.types.js';

export class UpdateLogService {
  async listLogsByProject(projectId: string, limit?: number): Promise<UpdateLog[]> {
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

    return await prisma.updateLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      ...(limit && limit > 0 ? { take: limit } : {}),
    });
  }

  async getLogById(id: string): Promise<UpdateLog | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('UpdateLog ID is required');
    }

    return await prisma.updateLog.findUnique({
      where: { id },
    });
  }

  async createLog(data: CreateLogInput): Promise<UpdateLog> {
    if (!data.projectId || typeof data.projectId !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    if (data.content === undefined || data.content === null || typeof data.content !== 'string' || !data.content.trim()) {
      throw new ValidationError('Content is required');
    }

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const author =
      data.author !== undefined && data.author !== null && String(data.author).trim()
        ? String(data.author).trim()
        : 'AI Agent';

    return await prisma.updateLog.create({
      data: {
        projectId: data.projectId,
        title: data.title.trim(),
        content: data.content.trim(),
        author,
      },
    });
  }

  async deleteLog(id: string): Promise<UpdateLog> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('UpdateLog ID is required');
    }

    try {
      return await prisma.updateLog.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('UpdateLog not found');
      }
      throw error;
    }
  }
}

export const updateLogService = new UpdateLogService();

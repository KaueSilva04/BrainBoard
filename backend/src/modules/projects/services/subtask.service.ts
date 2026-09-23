import type { Subtask } from '@prisma/client';
import { prisma } from '../../../prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';

export class SubtaskService {
  async getSubtaskById(id: string): Promise<Subtask | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Subtask ID is required');
    }

    return await prisma.subtask.findUnique({
      where: { id },
    });
  }

  async createSubtask(taskId: string, title: string): Promise<Subtask> {
    if (!taskId || typeof taskId !== 'string') {
      throw new ValidationError('Task ID is required');
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new ValidationError('Title is required');
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    try {
      return await prisma.subtask.create({
        data: {
          taskId,
          title: title.trim(),
        },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025')) {
        throw new NotFoundError('Task not found');
      }
      throw error;
    }
  }

  async toggleSubtask(id: string, isDone?: boolean): Promise<Subtask> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Subtask ID is required');
    }

    const current = await prisma.subtask.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundError('Subtask not found');
    }

    const newStatus = typeof isDone === 'boolean' ? isDone : !current.isDone;

    try {
      return await prisma.subtask.update({
        where: { id },
        data: { isDone: newStatus },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Subtask not found');
      }
      throw error;
    }
  }

  async deleteSubtask(id: string): Promise<Subtask> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Subtask ID is required');
    }

    try {
      return await prisma.subtask.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Subtask not found');
      }
      throw error;
    }
  }
}

export const subtaskService = new SubtaskService();

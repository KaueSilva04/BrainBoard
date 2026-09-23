import { prisma } from '../../../prisma.js';
import { SprintStatus } from '@prisma/client';

export class SprintService {
  async getProjectSprints(projectId: string) {
    return prisma.sprint.findMany({
      where: { projectId },
      include: {
        tasks: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSprint(projectId: string, data: { title: string; goal?: string; startDate?: Date; endDate?: Date }) {
    return prisma.sprint.create({
      data: {
        projectId,
        title: data.title,
        ...(data.goal !== undefined && { goal: data.goal }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
      },
      include: {
        tasks: true,
      }
    });
  }

  async updateSprint(id: string, data: { title?: string; goal?: string; status?: SprintStatus; startDate?: Date; endDate?: Date }) {
    return prisma.sprint.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.goal !== undefined && { goal: data.goal }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
      },
      include: {
        tasks: true,
      }
    });
  }

  async deleteSprint(id: string) {
    return prisma.sprint.delete({
      where: { id },
    });
  }

  async addTaskToSprint(sprintId: string, taskId: string) {
    return prisma.task.update({
      where: { id: taskId },
      data: { sprintId, isSprintActive: true },
    });
  }
}

export const sprintService = new SprintService();

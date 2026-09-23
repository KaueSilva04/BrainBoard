import { prisma } from '../../prisma.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';
import { calculateDaysRemaining, parseIsoDate } from '../shared/date.utils.js';
import type {
  AcademicDeadlineItem,
  CreateAcademicSubjectInput,
  CreateAcademicDeadlineInput,
  UpdateAcademicDeadlineInput,
  AcademicDeadlineFilters,
} from './academic.types.js';

export class AcademicService {
  async listSubjects() {
    const projects = await prisma.project.findMany({
      where: { type: 'ACADEMIC' },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              where: { dueDate: { not: null } },
              orderBy: { dueDate: 'asc' },
            },
          },
        },
        updateLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => {
      const allDeadlines = p.stages.flatMap((s) => s.tasks);
      const pendingDeadlines = allDeadlines.filter((t) => t.status !== 'DONE');
      return {
        ...p,
        totalStages: p.stages.length,
        totalDeadlines: allDeadlines.length,
        pendingDeadlinesCount: pendingDeadlines.length,
      };
    });
  }

  async getSubjectById(id: string) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Subject ID is required');
    }

    const project = await prisma.project.findFirst({
      where: { id, type: 'ACADEMIC' },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              include: { subtasks: true },
              orderBy: { dueDate: 'asc' },
            },
          },
        },
        updateLogs: {
          orderBy: { createdAt: 'desc' },
        },
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Academic subject not found');
    }

    return project;
  }

  async createSubject(data: CreateAcademicSubjectInput) {
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    const subject = await prisma.project.create({
      data: {
        title: data.title.trim(),
        description: data.description ? String(data.description).trim() : null,
        businessLogic: data.businessLogic ? String(data.businessLogic) : null,
        type: 'ACADEMIC',
        status: 'ACTIVE',
        settings: data.settings !== undefined ? data.settings : undefined,
        stages: {
          create: [
            { title: 'Matéria & Aulas', order: 1, status: 'PLANNING' },
            { title: 'Trabalhos & Entregas', order: 2, status: 'IN_PROGRESS' },
            { title: 'Provas & Avaliações', order: 3, status: 'PLANNING' },
          ],
        },
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { tasks: true },
        },
      },
    });

    return subject;
  }

  async listDeadlines(filters?: AcademicDeadlineFilters): Promise<AcademicDeadlineItem[]> {
    const where: any = {
      dueDate: { not: null },
      stage: {
        project: {
          type: 'ACADEMIC',
          ...(filters?.projectId ? { id: filters.projectId } : {}),
        },
      },
    };

    if (filters?.includeCompleted !== true) {
      where.status = { not: 'DONE' };
    }

    const now = new Date();
    if (filters?.days && filters.days > 0) {
      const maxDate = new Date(now.getTime() + filters.days * 24 * 60 * 60 * 1000);
      where.dueDate = {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Include today
        lte: maxDate,
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        stage: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks.map((t) => {
      const dueDateObj = t.dueDate!;
      const daysRemaining = calculateDaysRemaining(dueDateObj, now);
      const isOverdue = now > dueDateObj && t.status !== 'DONE';

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
        dueDate: dueDateObj.toISOString(),
        daysRemaining,
        isOverdue,
        subjectId: t.stage.project.id,
        subjectTitle: t.stage.project.title,
        stageId: t.stage.id,
        stageTitle: t.stage.title,
      };
    });
  }

  async createDeadline(data: CreateAcademicDeadlineInput): Promise<AcademicDeadlineItem> {
    if (!data.stageId || typeof data.stageId !== 'string') {
      throw new ValidationError('stageId is required');
    }
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }
    const dueDate = parseIsoDate(data.dueDate, 'dueDate');

    const stage = await prisma.stage.findUnique({
      where: { id: data.stageId },
      include: { project: true },
    });
    if (!stage) {
      throw new NotFoundError('Stage not found');
    }
    if (stage.project.type !== 'ACADEMIC') {
      throw new ValidationError('Stage must belong to an ACADEMIC subject');
    }

    const task = await prisma.task.create({
      data: {
        stageId: data.stageId,
        title: data.title.trim(),
        description: data.description ? String(data.description).trim() : null,
        dueDate,
        status: 'TODO',
      },
      include: {
        stage: {
          include: {
            project: true,
          },
        },
      },
    });

    const now = new Date();
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
      dueDate: task.dueDate!.toISOString(),
      daysRemaining: calculateDaysRemaining(task.dueDate!, now),
      isOverdue: false,
      subjectId: task.stage.project.id,
      subjectTitle: task.stage.project.title,
      stageId: task.stage.id,
      stageTitle: task.stage.title,
    };
  }

  async updateDeadline(id: string, data: UpdateAcademicDeadlineInput): Promise<AcademicDeadlineItem> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Deadline ID is required');
    }

    const updateData: any = {};
    if (data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
        throw new ValidationError('Title cannot be empty');
      }
      updateData.title = data.title.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description ? String(data.description).trim() : null;
    }
    if (data.status !== undefined) {
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(data.status)) {
        throw new ValidationError('Invalid status');
      }
      updateData.status = data.status;
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? parseIsoDate(data.dueDate, 'dueDate') : null;
    }

    try {
      const task = await prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          stage: {
            include: {
              project: true,
            },
          },
        },
      });

      const now = new Date();
      const dueDateObj = task.dueDate || new Date();
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as 'TODO' | 'IN_PROGRESS' | 'DONE',
        dueDate: task.dueDate ? task.dueDate.toISOString() : '',
        daysRemaining: calculateDaysRemaining(dueDateObj, now),
        isOverdue: now > dueDateObj && task.status !== 'DONE',
        subjectId: task.stage.project.id,
        subjectTitle: task.stage.project.title,
        stageId: task.stage.id,
        stageTitle: task.stage.title,
      };
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Deadline task not found');
      }
      throw error;
    }
  }

  async deleteDeadline(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Deadline ID is required');
    }

    try {
      await prisma.task.delete({ where: { id } });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Deadline task not found');
      }
      throw error;
    }
  }
}

export const academicService = new AcademicService();

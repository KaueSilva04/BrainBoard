import { prisma } from '../../prisma.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';
import { parseIsoDate } from '../shared/date.utils.js';
import type {
  CreateAcademicTermInput,
  UpdateAcademicTermInput,
  CreateAcademicSubjectInput,
  UpdateAcademicSubjectInput,
  CreateAcademicAssignmentInput,
  UpdateAcademicAssignmentInput,
} from './academic.types.js';

export class AcademicService {
  // --- TERMS ---
  async listTerms() {
    return prisma.academicTerm.findMany({
      include: {
        subjects: {
          include: {
            assignments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTermById(id: string) {
    if (!id) throw new ValidationError('Term ID is required');
    const term = await prisma.academicTerm.findUnique({
      where: { id },
      include: {
        subjects: {
          include: { assignments: true },
        },
      },
    });
    if (!term) throw new NotFoundError('Term not found');
    return term;
  }

  async createTerm(data: CreateAcademicTermInput) {
    if (!data.title?.trim()) throw new ValidationError('Title is required');
    return prisma.academicTerm.create({
      data: {
        title: data.title.trim(),
        startDate: data.startDate ? parseIsoDate(data.startDate, 'startDate') : null,
        endDate: data.endDate ? parseIsoDate(data.endDate, 'endDate') : null,
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  async updateTerm(id: string, data: UpdateAcademicTermInput) {
    if (!id) throw new ValidationError('Term ID is required');
    try {
      return await prisma.academicTerm.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.startDate !== undefined && { startDate: data.startDate ? parseIsoDate(data.startDate, 'startDate') : null }),
          ...(data.endDate !== undefined && { endDate: data.endDate ? parseIsoDate(data.endDate, 'endDate') : null }),
          ...(data.status !== undefined && { status: data.status }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundError('Term not found');
      throw error;
    }
  }

  async deleteTerm(id: string) {
    if (!id) throw new ValidationError('Term ID is required');
    try {
      await prisma.academicTerm.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundError('Term not found');
      throw error;
    }
  }

  // --- SUBJECTS ---
  async createSubject(data: CreateAcademicSubjectInput) {
    if (!data.termId) throw new ValidationError('termId is required');
    if (!data.title?.trim()) throw new ValidationError('Title is required');
    
    const term = await prisma.academicTerm.findUnique({ where: { id: data.termId } });
    if (!term) throw new NotFoundError('Term not found');

    return prisma.academicSubject.create({
      data: {
        termId: data.termId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        professor: data.professor?.trim() || null,
        colorCode: data.colorCode?.trim() || null,
      },
    });
  }

  async updateSubject(id: string, data: UpdateAcademicSubjectInput) {
    if (!id) throw new ValidationError('Subject ID is required');
    try {
      return await prisma.academicSubject.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.professor !== undefined && { professor: data.professor }),
          ...(data.colorCode !== undefined && { colorCode: data.colorCode }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundError('Subject not found');
      throw error;
    }
  }

  async deleteSubject(id: string) {
    if (!id) throw new ValidationError('Subject ID is required');
    try {
      await prisma.academicSubject.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundError('Subject not found');
      throw error;
    }
  }

  // --- ASSIGNMENTS ---
  async createAssignment(data: CreateAcademicAssignmentInput) {
    if (!data.subjectId) throw new ValidationError('subjectId is required');
    if (!data.title?.trim()) throw new ValidationError('Title is required');

    const subject = await prisma.academicSubject.findUnique({ where: { id: data.subjectId } });
    if (!subject) throw new NotFoundError('Subject not found');

    return prisma.academicAssignment.create({
      data: {
        subjectId: data.subjectId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        dueDate: data.dueDate ? parseIsoDate(data.dueDate, 'dueDate') : null,
        ...(data.type !== undefined && { type: data.type }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.grade !== undefined && { grade: data.grade }),
      },
    });
  }

  async updateAssignment(id: string, data: UpdateAcademicAssignmentInput) {
    if (!id) throw new ValidationError('Assignment ID is required');
    try {
      return await prisma.academicAssignment.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title.trim() }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.dueDate !== undefined && { dueDate: data.dueDate ? parseIsoDate(data.dueDate, 'dueDate') : null }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.grade !== undefined && { grade: data.grade }),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundError('Assignment not found');
      throw error;
    }
  }

  async deleteAssignment(id: string) {
    if (!id) throw new ValidationError('Assignment ID is required');
    try {
      await prisma.academicAssignment.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundError('Assignment not found');
      throw error;
    }
  }
}

export const academicService = new AcademicService();

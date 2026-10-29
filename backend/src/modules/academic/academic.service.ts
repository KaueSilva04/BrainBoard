import { prisma } from '../../prisma.js';
import { ValidationError, NotFoundError } from '../shared/errors.js';
import { parseIsoDate } from '../shared/date.utils.js';
import type {
  CreateAcademicSubjectInput,
  UpdateAcademicSubjectInput,
  CreateAcademicAssignmentInput,
  UpdateAcademicAssignmentInput,
} from './academic.types.js';

export class AcademicService {
  // --- SUBJECTS ---
  async listSubjects(userId: string) {
    if (!userId) throw new ValidationError('User ID is required');
    return prisma.academicSubject.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });
  }

  async getSubjectById(id: string, userId: string) {
    if (!id) throw new ValidationError('Subject ID is required');
    if (!userId) throw new ValidationError('User ID is required');
    const subject = await prisma.academicSubject.findFirst({
      where: { id, userId },
      include: {
        assignments: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });
    if (!subject) throw new NotFoundError('Subject not found');
    return subject;
  }

  async createSubject(userId: string, data: CreateAcademicSubjectInput) {
    if (!userId) throw new ValidationError('User ID is required');
    if (!data.title?.trim()) throw new ValidationError('Title is required');

    return prisma.academicSubject.create({
      data: {
        userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        professor: data.professor?.trim() || null,
        colorCode: data.colorCode?.trim() || null,
      },
    });
  }

  async updateSubject(id: string, userId: string, data: UpdateAcademicSubjectInput) {
    if (!id) throw new ValidationError('Subject ID is required');
    if (!userId) throw new ValidationError('User ID is required');

    const existing = await prisma.academicSubject.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundError('Subject not found');
    }

    if (data.title !== undefined && !data.title.trim()) {
      throw new ValidationError('Title cannot be empty');
    }

    return await prisma.academicSubject.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.professor !== undefined && { professor: data.professor?.trim() || null }),
        ...(data.colorCode !== undefined && { colorCode: data.colorCode?.trim() || null }),
      },
    });
  }

  async deleteSubject(id: string, userId: string) {
    if (!id) throw new ValidationError('Subject ID is required');
    if (!userId) throw new ValidationError('User ID is required');

    const existing = await prisma.academicSubject.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundError('Subject not found');
    }

    await prisma.academicSubject.delete({ where: { id } });
  }

  // --- ASSIGNMENTS ---
  async listAssignments(userId: string, subjectId?: string) {
    if (!userId) throw new ValidationError('User ID is required');

    const where: any = {
      OR: [
        { userId },
        { subject: { userId } },
      ],
    };

    if (subjectId) {
      where.subjectId = subjectId;
    }

    return prisma.academicAssignment.findMany({
      where,
      orderBy: { dueDate: 'asc' },
    });
  }

  async getAssignmentById(id: string, userId: string) {
    if (!id) throw new ValidationError('Assignment ID is required');
    if (!userId) throw new ValidationError('User ID is required');
    const assignment = await prisma.academicAssignment.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { subject: { userId } },
        ],
      },
      include: { subject: true },
    });
    if (!assignment) throw new NotFoundError('Assignment not found');
    return assignment;
  }

  async createAssignment(userId: string, data: CreateAcademicAssignmentInput) {
    if (!userId) throw new ValidationError('User ID is required');
    if (!data.subjectId) throw new ValidationError('subjectId is required');
    if (!data.title?.trim()) throw new ValidationError('Title is required');

    // Verify parent subject belongs to authenticated user
    const subject = await prisma.academicSubject.findFirst({
      where: { id: data.subjectId, userId },
    });
    if (!subject) throw new NotFoundError('Subject not found');

    return prisma.academicAssignment.create({
      data: {
        userId,
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

  async updateAssignment(id: string, userId: string, data: UpdateAcademicAssignmentInput) {
    if (!id) throw new ValidationError('Assignment ID is required');
    if (!userId) throw new ValidationError('User ID is required');

    const existing = await prisma.academicAssignment.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { subject: { userId } },
        ],
      },
    });
    if (!existing) {
      throw new NotFoundError('Assignment not found');
    }

    if (data.title !== undefined && !data.title.trim()) {
      throw new ValidationError('Title cannot be empty');
    }

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
  }

  async deleteAssignment(id: string, userId: string) {
    if (!id) throw new ValidationError('Assignment ID is required');
    if (!userId) throw new ValidationError('User ID is required');

    const existing = await prisma.academicAssignment.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { subject: { userId } },
        ],
      },
    });
    if (!existing) {
      throw new NotFoundError('Assignment not found');
    }

    await prisma.academicAssignment.delete({ where: { id } });
  }
}

export const academicService = new AcademicService();

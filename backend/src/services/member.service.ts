import type { Member } from '@prisma/client';
import { prisma } from '../prisma.js';
import { ValidationError, NotFoundError } from './errors.js';

export interface CreateMemberInput {
  projectId: string;
  name: string;
  role: string;
  email?: string | null | undefined;
}

export interface UpdateMemberInput {
  name?: string | undefined;
  role?: string | undefined;
  email?: string | null | undefined;
}

export class MemberService {
  async listMembersByProject(projectId: string): Promise<Member[]> {
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

    return await prisma.member.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMemberById(id: string): Promise<Member | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Member ID is required');
    }

    return await prisma.member.findUnique({
      where: { id },
    });
  }

  async createMember(data: CreateMemberInput): Promise<Member> {
    if (!data.projectId || typeof data.projectId !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new ValidationError('Name is required');
    }

    if (!data.role || typeof data.role !== 'string' || !data.role.trim()) {
      throw new ValidationError('Role is required');
    }

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const email =
      data.email !== undefined && data.email !== null && String(data.email).trim()
        ? String(data.email).trim()
        : null;

    return await prisma.member.create({
      data: {
        projectId: data.projectId,
        name: data.name.trim(),
        role: data.role.trim(),
        email,
      },
    });
  }

  async updateMember(id: string, data: UpdateMemberInput): Promise<Member> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Member ID is required');
    }

    const updateData: {
      name?: string;
      role?: string;
      email?: string | null;
    } = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new ValidationError('Name cannot be empty');
      }
      updateData.name = data.name.trim();
    }

    if (data.role !== undefined) {
      if (typeof data.role !== 'string' || !data.role.trim()) {
        throw new ValidationError('Role cannot be empty');
      }
      updateData.role = data.role.trim();
    }

    if (data.email !== undefined) {
      updateData.email = data.email === null ? null : String(data.email).trim();
    }

    try {
      return await prisma.member.update({
        where: { id },
        data: updateData,
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Member not found');
      }
      throw error;
    }
  }

  async deleteMember(id: string): Promise<Member> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Member ID is required');
    }

    try {
      return await prisma.member.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Member not found');
      }
      throw error;
    }
  }
}

export const memberService = new MemberService();

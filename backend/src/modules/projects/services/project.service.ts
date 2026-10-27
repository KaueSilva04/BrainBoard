import { ProjectStatus, ProjectType } from '@prisma/client';
import type { Project, Prisma } from '@prisma/client';
import { prisma } from '../../../prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import { validateTextEncoding } from '../../shared/text-encoding.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilterOptions,
  ProjectWithDetails,
} from '../projects.types.js';

export const VALID_PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'COMPLETED'];
export const VALID_PROJECT_TYPES: ProjectType[] = ['SOFTWARE'];

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatarColor: true,
};

const PROJECT_DETAILS_INCLUDE = {
  owner: { select: USER_SELECT },
  collaborators: {
    include: {
      user: { select: USER_SELECT },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  stages: {
    orderBy: { order: 'asc' as const },
    include: {
      tasks: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          subtasks: { orderBy: { createdAt: 'asc' as const } },
          assignee: { select: USER_SELECT },
        },
      },
    },
  },
  updateLogs: {
    orderBy: { createdAt: 'desc' as const },
  },
  members: {
    orderBy: { createdAt: 'asc' as const },
  },
};

export class ProjectService {
  async listProjects(filters?: ProjectFilterOptions): Promise<ProjectWithDetails[]> {
    const where: any = {};

    if (filters?.status) {
      if (!VALID_PROJECT_STATUSES.includes(filters.status as ProjectStatus)) {
        throw new ValidationError(
          `Invalid project status: ${filters.status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`
        );
      }
      where.status = filters.status as ProjectStatus;
    }

    if (filters?.type) {
      if (!VALID_PROJECT_TYPES.includes(filters.type as ProjectType)) {
        throw new ValidationError(
          `Invalid project type: ${filters.type}. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}`
        );
      }
      where.type = filters.type as ProjectType;
    }

    if (filters?.userId) {
      where.OR = [
        { ownerId: filters.userId },
        { collaborators: { some: { userId: filters.userId } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: PROJECT_DETAILS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return projects as unknown as ProjectWithDetails[];
  }

  async getProjectById(id: string, userId?: string): Promise<ProjectWithDetails | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: PROJECT_DETAILS_INCLUDE,
    });

    if (!project) return null;

    if (userId) {
      const isOwner = project.ownerId === userId;
      const isCollab = project.collaborators.some((c) => c.userId === userId);
      if (!isOwner && !isCollab) {
        return null;
      }
    }

    return project as unknown as ProjectWithDetails;
  }

  async createProject(data: CreateProjectInput): Promise<ProjectWithDetails> {
    validateTextEncoding({ title: data.title, description: data.description, businessLogic: data.businessLogic });
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Title is required');
    }

    let status: ProjectStatus = 'PLANNING';
    if (data.status !== undefined) {
      if (!VALID_PROJECT_STATUSES.includes(data.status as ProjectStatus)) {
        throw new ValidationError(
          `Invalid project status: ${data.status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`
        );
      }
      status = data.status as ProjectStatus;
    }

    let type: ProjectType = 'SOFTWARE';
    if (data.type !== undefined) {
      if (!VALID_PROJECT_TYPES.includes(data.type as ProjectType)) {
        throw new ValidationError(
          `Invalid project type: ${data.type}. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}`
        );
      }
      type = data.type as ProjectType;
    }

    const description =
      data.description !== undefined && data.description !== null
        ? String(data.description).trim()
        : null;

    const businessLogic =
      data.businessLogic !== undefined && data.businessLogic !== null
        ? String(data.businessLogic)
        : null;

    const githubRepo =
      data.githubRepo !== undefined && data.githubRepo !== null
        ? String(data.githubRepo).trim()
        : null;

    const settings = data.settings !== undefined ? (data.settings as Prisma.InputJsonValue) : undefined;
    const ownerId = data.ownerId || null;

    const project = await prisma.project.create({
      data: {
        title: data.title.trim(),
        description,
        businessLogic,
        status,
        type,
        githubRepo,
        ownerId,
        ...(settings !== undefined ? { settings } : {}),
        ...(ownerId
          ? {
              collaborators: {
                create: {
                  userId: ownerId,
                  role: 'OWNER',
                },
              },
            }
          : {}),
      },
      include: PROJECT_DETAILS_INCLUDE,
    });

    return project as unknown as ProjectWithDetails;
  }

  async updateProject(id: string, data: UpdateProjectInput, userId?: string): Promise<ProjectWithDetails> {
    validateTextEncoding({ title: data.title, description: data.description, businessLogic: data.businessLogic });
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    if (userId) {
      const existing = await prisma.project.findUnique({
        where: { id },
        select: {
          ownerId: true,
          collaborators: { where: { userId }, select: { id: true } },
        },
      });
      if (!existing) {
        throw new NotFoundError('Project not found');
      }
      if (existing.ownerId !== userId && existing.collaborators.length === 0) {
        throw new ValidationError('Acesso negado ao projeto');
      }
    }

    const updateData: {
      title?: string;
      description?: string | null;
      businessLogic?: string | null;
      status?: ProjectStatus;
      type?: ProjectType;
      githubRepo?: string | null;
      settings?: Prisma.InputJsonValue;
    } = {};

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

    if (data.businessLogic !== undefined) {
      updateData.businessLogic =
        data.businessLogic === null ? null : String(data.businessLogic);
    }

    if (data.status !== undefined) {
      if (!VALID_PROJECT_STATUSES.includes(data.status as ProjectStatus)) {
        throw new ValidationError(
          `Invalid project status: ${data.status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`
        );
      }
      updateData.status = data.status as ProjectStatus;
    }

    if (data.type !== undefined) {
      if (!VALID_PROJECT_TYPES.includes(data.type as ProjectType)) {
        throw new ValidationError(
          `Invalid project type: ${data.type}. Must be one of: ${VALID_PROJECT_TYPES.join(', ')}`
        );
      }
      updateData.type = data.type as ProjectType;
    }

    if (data.githubRepo !== undefined) {
      updateData.githubRepo =
        data.githubRepo === null ? null : String(data.githubRepo).trim();
    }

    if (data.settings !== undefined) {
      updateData.settings = data.settings as Prisma.InputJsonValue;
    }

    try {
      const updated = await prisma.project.update({
        where: { id },
        data: updateData,
        include: PROJECT_DETAILS_INCLUDE,
      });
      return updated as unknown as ProjectWithDetails;
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Project not found');
      }
      throw error;
    }
  }

  async updateBusinessLogic(id: string, businessLogic: string, userId?: string): Promise<Project> {
    validateTextEncoding({ businessLogic });
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
    }
    if (typeof businessLogic !== 'string') {
      throw new ValidationError('Business logic must be a string');
    }

    if (userId) {
      const existing = await prisma.project.findUnique({
        where: { id },
        select: {
          ownerId: true,
          collaborators: { where: { userId }, select: { id: true } },
        },
      });
      if (!existing) {
        throw new NotFoundError('Project not found');
      }
      if (existing.ownerId !== userId && existing.collaborators.length === 0) {
        throw new ValidationError('Acesso negado ao projeto');
      }
    }

    try {
      return await prisma.project.update({
        where: { id },
        data: { businessLogic },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Project not found');
      }
      throw error;
    }
  }

  async updateProjectSettings(
    id: string,
    data: { githubRepo?: string | null | undefined; settings?: any | undefined; businessLogic?: string | null | undefined },
    userId?: string
  ): Promise<Project> {
    validateTextEncoding({ businessLogic: data.businessLogic });
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    if (userId) {
      const existing = await prisma.project.findUnique({
        where: { id },
        select: {
          ownerId: true,
          collaborators: { where: { userId }, select: { id: true } },
        },
      });
      if (!existing) {
        throw new NotFoundError('Project not found');
      }
      if (existing.ownerId !== userId && existing.collaborators.length === 0) {
        throw new ValidationError('Acesso negado ao projeto');
      }
    }

    const updateData: {
      githubRepo?: string | null;
      settings?: Prisma.InputJsonValue;
      businessLogic?: string | null;
    } = {};

    if (data.githubRepo !== undefined) {
      updateData.githubRepo = data.githubRepo === null ? null : String(data.githubRepo).trim();
    }
    if (data.settings !== undefined) {
      updateData.settings = data.settings as Prisma.InputJsonValue;
    }
    if (data.businessLogic !== undefined) {
      updateData.businessLogic = data.businessLogic === null ? null : String(data.businessLogic);
    }

    try {
      return await prisma.project.update({
        where: { id },
        data: updateData,
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Project not found');
      }
      throw error;
    }
  }

  async deleteProject(id: string, userId?: string): Promise<Project> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (userId && project.ownerId && project.ownerId !== userId) {
      throw new ValidationError('Apenas o proprietário pode excluir o projeto');
    }

    try {
      return await prisma.project.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Project not found');
      }
      throw error;
    }
  }
}

export const projectService = new ProjectService();

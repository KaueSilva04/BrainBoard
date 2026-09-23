import { ProjectStatus, ProjectType } from '@prisma/client';
import type { Project, Prisma } from '@prisma/client';
import { prisma } from '../../../prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilterOptions,
  ProjectWithDetails,
} from '../projects.types.js';

export const VALID_PROJECT_STATUSES: ProjectStatus[] = ['PLANNING', 'ACTIVE', 'COMPLETED'];
export const VALID_PROJECT_TYPES: ProjectType[] = ['SOFTWARE'];

export class ProjectService {
  async listProjects(filters?: ProjectFilterOptions): Promise<ProjectWithDetails[]> {
    const where: { status?: ProjectStatus; type?: ProjectType } = {};

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

    return await prisma.project.findMany({
      where,
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' },
              include: { subtasks: { orderBy: { createdAt: 'asc' } } },
            },
          },
        },
        updateLogs: {
          orderBy: { createdAt: 'desc' },
        },
        members: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProjectById(id: string): Promise<ProjectWithDetails | null> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
    }

    return await prisma.project.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' },
              include: { subtasks: { orderBy: { createdAt: 'asc' } } },
            },
          },
        },
        updateLogs: {
          orderBy: { createdAt: 'desc' },
        },
        members: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createProject(data: CreateProjectInput): Promise<ProjectWithDetails> {
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

    return await prisma.project.create({
      data: {
        title: data.title.trim(),
        description,
        businessLogic,
        status,
        type,
        githubRepo,
        ...(settings !== undefined ? { settings } : {}),
      },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              include: { subtasks: true },
            },
          },
        },
        updateLogs: true,
        members: true,
      },
    });
  }

  async updateProject(id: string, data: UpdateProjectInput): Promise<ProjectWithDetails> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
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
      return await prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          stages: {
            orderBy: { order: 'asc' },
            include: {
              tasks: {
                include: { subtasks: true },
              },
            },
          },
          updateLogs: {
            orderBy: { createdAt: 'desc' },
          },
          members: true,
        },
      });
    } catch (error: any) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new NotFoundError('Project not found');
      }
      throw error;
    }
  }

  async updateBusinessLogic(id: string, businessLogic: string): Promise<Project> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
    }
    if (typeof businessLogic !== 'string') {
      throw new ValidationError('Business logic must be a string');
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
    data: { githubRepo?: string | null | undefined; settings?: any | undefined; businessLogic?: string | null | undefined }
  ): Promise<Project> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
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

  async deleteProject(id: string): Promise<Project> {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Project ID is required');
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

import { prisma } from '../../../prisma.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import type { ProjectMemberRole } from '@prisma/client';

export interface ProjectCollaboratorDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarColor: string | null;
  role: ProjectMemberRole;
  isOwner: boolean;
  joinedAt?: Date | string;
}

export interface AddCollaboratorInput {
  email?: string;
  userId?: string;
  role?: ProjectMemberRole;
}

export class CollaboratorService {
  async getProjectCollaborators(projectId: string, requestingUserId?: string): Promise<ProjectCollaboratorDto[]> {
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarColor: true },
        },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarColor: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Projeto não encontrado');
    }

    if (requestingUserId) {
      const isOwner = project.ownerId === requestingUserId;
      const isCollab = project.collaborators.some((c) => c.userId === requestingUserId);
      if (!isOwner && !isCollab) {
        throw new ValidationError('Acesso negado ao projeto');
      }
    }

    const result: ProjectCollaboratorDto[] = [];

    if (project.owner) {
      result.push({
        id: project.owner.id,
        userId: project.owner.id,
        name: project.owner.name,
        email: project.owner.email,
        avatarColor: project.owner.avatarColor,
        role: 'OWNER',
        isOwner: true,
      });
    }

    for (const member of project.collaborators) {
      if (member.userId !== project.ownerId) {
        result.push({
          id: member.id,
          userId: member.user.id,
          name: member.user.name,
          email: member.user.email,
          avatarColor: member.user.avatarColor,
          role: member.role,
          isOwner: false,
          joinedAt: member.joinedAt,
        });
      }
    }

    return result;
  }

  async addCollaborator(
    projectId: string,
    requestingUserId: string,
    input: AddCollaboratorInput
  ): Promise<ProjectCollaboratorDto> {
    if (!projectId) {
      throw new ValidationError('Project ID is required');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundError('Projeto não encontrado');
    }

    if (project.ownerId && project.ownerId !== requestingUserId) {
      throw new ValidationError('Apenas o proprietário do projeto pode adicionar colaboradores');
    }

    let targetUser = null;
    if (input.userId) {
      targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { id: true, name: true, email: true, avatarColor: true },
      });
    } else if (input.email) {
      const email = input.email.toLowerCase().trim();
      targetUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, avatarColor: true },
      });
    }

    if (!targetUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    if (targetUser.id === project.ownerId) {
      throw new ValidationError('Este usuário já é o proprietário do projeto');
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUser.id },
      },
    });

    if (existingMember) {
      throw new ValidationError('Este usuário já é membro do projeto');
    }

    const role: ProjectMemberRole = input.role === 'OWNER' ? 'OWNER' : 'COLLABORATOR';

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarColor: true } },
      },
    });

    return {
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatarColor: member.user.avatarColor,
      role: member.role,
      isOwner: false,
      joinedAt: member.joinedAt,
    };
  }

  async removeCollaborator(
    projectId: string,
    requestingUserId: string,
    targetUserId: string
  ): Promise<{ success: boolean; message: string }> {
    if (!projectId || !targetUserId) {
      throw new ValidationError('Project ID e User ID são obrigatórios');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      throw new NotFoundError('Projeto não encontrado');
    }

    if (targetUserId === project.ownerId) {
      throw new ValidationError('Não é possível remover o proprietário do projeto');
    }

    if (project.ownerId && project.ownerId !== requestingUserId && requestingUserId !== targetUserId) {
      throw new ValidationError('Apenas o proprietário pode remover colaboradores');
    }

    await prisma.projectMember.deleteMany({
      where: {
        projectId,
        userId: targetUserId,
      },
    });

    // Safe Task Unassignment Cleanup
    await prisma.task.updateMany({
      where: {
        stage: { projectId },
        assigneeId: targetUserId,
      },
      data: {
        assigneeId: null,
      },
    });

    return {
      success: true,
      message: 'Colaborador removido com sucesso',
    };
  }

  async isMemberOrOwner(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        collaborators: {
          where: { userId },
          select: { id: true },
        },
      },
    });

    if (!project) return false;
    return project.ownerId === userId || project.collaborators.length > 0;
  }
}

export const collaboratorService = new CollaboratorService();

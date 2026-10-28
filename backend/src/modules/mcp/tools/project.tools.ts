import { projectService } from '../../projects/services/project.service.js';
import { updateLogService } from '../../projects/services/update-log.service.js';
import { stageService } from '../../projects/services/stage.service.js';
import { collaboratorService } from '../../projects/services/collaborator.service.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const projectToolSchemas: Tool[] = [
  {
    name: 'list_projects',
    description: 'Lista todos os projetos disponíveis, retornando seus IDs, títulos e descrições.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_project',
    description: 'Cria um novo projeto.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do projeto.' },
        description: { type: 'string', description: 'Descrição do projeto.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_stage',
    description: 'Cria uma nova etapa (stage/coluna) dentro de um projeto.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID do projeto.' },
        title: { type: 'string', description: 'Título da etapa (ex: Backlog, Design, Frontend).' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'update_stage',
    description: 'Atualiza o título, status (PLANNING, IN_PROGRESS, COMPLETED) ou ordem de uma etapa (stage).',
    inputSchema: {
      type: 'object',
      properties: {
        stageId: { type: 'string', description: 'ID da etapa (stage).' },
        title: { type: 'string', description: 'Novo título da etapa.' },
        status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED'], description: 'Novo status da etapa.' },
        order: { type: 'number', description: 'Nova ordem da etapa no projeto.' },
      },
      required: ['stageId'],
    },
  },
  {
    name: 'delete_stage',
    description: 'Exclui uma etapa (stage/coluna) de um projeto e as tarefas vinculadas a ela.',
    inputSchema: {
      type: 'object',
      properties: {
        stageId: { type: 'string', description: 'ID da etapa (stage) a ser excluída.' },
      },
      required: ['stageId'],
    },
  },
  {
    name: 'read_project_context',
    description:
      'Lê o contexto completo do projeto para a IA: metadados, businessLogic, githubRepo, settings, etapas com tarefas e subtarefas, logs de atualização e membros.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID do projeto para carregar o contexto completo.',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'update_business_logic',
    description: 'Atualiza a lógica de negócio (businessLogic em Markdown) de um projeto.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID do projeto.',
        },
        businessLogic: {
          type: 'string',
          description: 'Texto completo em Markdown descrevendo regras de negócio ou arquitetura.',
        },
      },
      required: ['projectId', 'businessLogic'],
    },
  },
  {
    name: 'update_project_settings',
    description:
      'Atualiza repositório GitHub, configurações JSON dinâmicas e/ou lógica de negócio de um projeto.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID do projeto.',
        },
        githubRepo: {
          type: 'string',
          description: 'URL ou slug do repositório GitHub (ex: https://github.com/org/repo).',
        },
        settings: {
          type: 'object',
          description: 'Objeto JSON com configurações dinâmicas (stack, URLs de deploy, chaves, etc).',
        },
        businessLogic: {
          type: 'string',
          description: 'Lógica de negócio / regras arquiteturais.',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'log_project_update',
    description:
      'Cria um novo diário de bordo (UpdateLog) com título, conteúdo em Markdown e autor para um projeto.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'ID do projeto.',
        },
        title: {
          type: 'string',
          description: 'Título do log de atualização.',
        },
        content: {
          type: 'string',
          description: 'Conteúdo em Markdown detalhando as mudanças, decisões ou status.',
        },
        author: {
          type: 'string',
          description: 'Nome ou identificador do autor (opcional, padrão: AI Agent).',
        },
      },
      required: ['projectId', 'title', 'content'],
    },
  },
  {
    name: 'list_project_collaborators',
    description:
      'Lista o proprietário (OWNER) e todos os colaboradores (COLLABORATOR) com acesso ao projeto, retornando seus userIds, nomes e e-mails.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID do projeto.' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'add_project_collaborator',
    description:
      'Adiciona um usuário registrado como colaborador (COLLABORATOR) de um projeto pelo e-mail ou userId (apenas o proprietário pode adicionar).',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID do projeto.' },
        email: { type: 'string', description: 'E-mail do usuário registrado a adicionar.' },
        userId: { type: 'string', description: 'ID do usuário registrado a adicionar (alternativa ao email).' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'remove_project_collaborator',
    description:
      'Remove um colaborador de um projeto e desatribui suas tarefas naquele projeto.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID do projeto.' },
        userId: { type: 'string', description: 'ID do usuário colaborador a remover.' },
      },
      required: ['projectId', 'userId'],
    },
  },
];

export async function handleProjectTools(name: string, args: any, userId?: string) {
  if (name === 'list_projects') {
    const projects = await projectService.listProjects({ userId });
    const mapped = projects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
      ownerId: (p as any).ownerId ?? null,
      owner: (p as any).owner ?? null,
      collaboratorsCount: Array.isArray((p as any).collaborators) ? (p as any).collaborators.length : 0,
    }));
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(mapped, null, 2) }],
    };
  }

  if (name === 'create_project') {
    const title = String(args?.title ?? '').trim();
    if (!title) throw new Error('title é obrigatório');
    
    const project = await projectService.createProject({
      title,
      description: args?.description ? String(args.description) : undefined,
      ownerId: userId,
    });
    
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Projeto criado com sucesso.', id: project.id, project }, null, 2) }],
    };
  }

  if (name === 'create_stage') {
    const projectId = String(args?.projectId ?? '').trim();
    const title = String(args?.title ?? '').trim();
    if (!projectId || !title) throw new Error('projectId e title são obrigatórios');

    if (userId) {
      const hasAccess = await collaboratorService.isMemberOrOwner(projectId, userId);
      if (!hasAccess) {
        throw new Error('Acesso negado: você não é proprietário nem colaborador deste projeto');
      }
    }

    const stage = await stageService.createStage({
      projectId,
      title,
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: `Etapa '${stage.title}' criada com sucesso.`, id: stage.id, stage }, null, 2) }],
    };
  }

  if (name === 'update_stage') {
    const stageId = String(args?.stageId ?? '').trim();
    if (!stageId) throw new Error('stageId é obrigatório');

    const existingStage = await stageService.getStageById(stageId);
    if (!existingStage) {
      throw new Error(`Etapa não encontrada para o ID: ${stageId}`);
    }

    if (userId) {
      const hasAccess = await collaboratorService.isMemberOrOwner(existingStage.projectId, userId);
      if (!hasAccess) {
        throw new Error('Acesso negado: você não é proprietário nem colaborador deste projeto');
      }
    }

    const updated = await stageService.updateStage(stageId, {
      ...(args?.title !== undefined ? { title: String(args.title).trim() } : {}),
      ...(args?.status !== undefined ? { status: String(args.status).trim() } : {}),
      ...(typeof args?.order === 'number' ? { order: args.order } : {}),
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: `Etapa '${updated.title}' atualizada com sucesso.`, id: updated.id, stage: updated }, null, 2),
        },
      ],
    };
  }

  if (name === 'delete_stage') {
    const stageId = String(args?.stageId ?? '').trim();
    if (!stageId) throw new Error('stageId é obrigatório');

    const existingStage = await stageService.getStageById(stageId);
    if (!existingStage) {
      throw new Error(`Etapa não encontrada para o ID: ${stageId}`);
    }

    if (userId) {
      const hasAccess = await collaboratorService.isMemberOrOwner(existingStage.projectId, userId);
      if (!hasAccess) {
        throw new Error('Acesso negado: você não é proprietário nem colaborador deste projeto');
      }
    }

    const deleted = await stageService.deleteStage(stageId);
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              success: true,
              message: `Etapa '${deleted.title}' excluída com sucesso.`,
              id: deleted.id,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === 'read_project_context') {
    const projectId = String(args?.projectId ?? '').trim();
    if (!projectId) {
      throw new Error('projectId é obrigatório');
    }

    const project = await projectService.getProjectById(projectId, userId);
    if (!project) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Projeto não encontrado ou sem permissão de acesso para o ID: ${projectId}` }],
      };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(project, null, 2) }],
    };
  }

  if (name === 'update_business_logic') {
    const projectId = String(args?.projectId ?? '').trim();
    const businessLogic = String(args?.businessLogic ?? '');

    if (!projectId) {
      throw new Error('projectId é obrigatório');
    }

    await projectService.updateBusinessLogic(projectId, businessLogic, userId);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: `Lógica de negócio do projeto ${projectId} atualizada com sucesso.` }, null, 2),
        },
      ],
    };
  }

  if (name === 'update_project_settings') {
    const projectId = String(args?.projectId ?? '').trim();
    if (!projectId) {
      throw new Error('projectId é obrigatório');
    }

    await projectService.updateProjectSettings(
      projectId,
      {
        githubRepo:
          args?.githubRepo !== undefined
            ? args.githubRepo
              ? String(args.githubRepo).trim()
              : null
            : undefined,
        settings: args?.settings !== undefined ? args.settings : undefined,
        businessLogic: args?.businessLogic !== undefined ? String(args.businessLogic) : undefined,
      },
      userId
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: `Configurações do projeto ${projectId} atualizadas com sucesso.` }, null, 2),
        },
      ],
    };
  }

  if (name === 'log_project_update') {
    const projectId = String(args?.projectId ?? '').trim();
    const title = String(args?.title ?? '').trim();
    const content = String(args?.content ?? '').trim();
    const author = args?.author ? String(args.author).trim() : undefined;

    if (!projectId || !title || !content) {
      throw new Error('projectId, title e content são obrigatórios');
    }

    if (userId) {
      const hasAccess = await collaboratorService.isMemberOrOwner(projectId, userId);
      if (!hasAccess) {
        throw new Error('Acesso negado: você não é proprietário nem colaborador deste projeto');
      }
    }

    const log = await updateLogService.createLog({
      projectId,
      title,
      content,
      author,
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Log de atualização criado com sucesso.', id: log.id, log }, null, 2) }],
    };
  }

  if (name === 'list_project_collaborators') {
    const projectId = String(args?.projectId ?? '').trim();
    if (!projectId) throw new Error('projectId é obrigatório');

    const collaborators = await collaboratorService.getProjectCollaborators(projectId, userId);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(collaborators, null, 2) }],
    };
  }

  if (name === 'add_project_collaborator') {
    const projectId = String(args?.projectId ?? '').trim();
    if (!projectId) throw new Error('projectId é obrigatório');
    if (!userId) throw new Error('Autenticação necessária para adicionar colaborador');

    const collaborator = await collaboratorService.addCollaborator(projectId, userId, {
      ...(args?.email ? { email: String(args.email).trim() } : {}),
      ...(args?.userId ? { userId: String(args.userId).trim() } : {}),
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: 'Colaborador adicionado com sucesso.', collaborator }, null, 2),
        },
      ],
    };
  }

  if (name === 'remove_project_collaborator') {
    const projectId = String(args?.projectId ?? '').trim();
    const targetUserId = String(args?.userId ?? '').trim();
    if (!projectId || !targetUserId) throw new Error('projectId e userId são obrigatórios');
    if (!userId) throw new Error('Autenticação necessária para remover colaborador');

    const result = await collaboratorService.removeCollaborator(projectId, userId, targetUserId);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }

  return null;
}

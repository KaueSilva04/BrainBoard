import { projectService } from '../../projects/services/project.service.js';
import { updateLogService } from '../../projects/services/update-log.service.js';
import { stageService } from '../../projects/services/stage.service.js';
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
];

export async function handleProjectTools(name: string, args: any) {
  if (name === 'list_projects') {
    const projects = await projectService.listProjects();
    const mapped = projects.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
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
    });
    
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Projeto criado com sucesso.', id: project.id, project }, null, 2) }],
    };
  }

  if (name === 'create_stage') {
    const projectId = String(args?.projectId ?? '').trim();
    const title = String(args?.title ?? '').trim();
    if (!projectId || !title) throw new Error('projectId e title são obrigatórios');

    const stage = await stageService.createStage({
      projectId,
      title,
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: `Etapa '${stage.title}' criada com sucesso.`, id: stage.id, stage }, null, 2) }],
    };
  }

  if (name === 'read_project_context') {
    const projectId = String(args?.projectId ?? '').trim();
    if (!projectId) {
      throw new Error('projectId é obrigatório');
    }

    const project = await projectService.getProjectById(projectId);
    if (!project) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Projeto não encontrado com o ID: ${projectId}` }],
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

    await projectService.updateBusinessLogic(projectId, businessLogic);

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

    await projectService.updateProjectSettings(projectId, {
      githubRepo:
        args?.githubRepo !== undefined
          ? args.githubRepo
            ? String(args.githubRepo).trim()
            : null
          : undefined,
      settings: args?.settings !== undefined ? args.settings : undefined,
      businessLogic: args?.businessLogic !== undefined ? String(args.businessLogic) : undefined,
    });

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

  return null;
}

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { prisma } from './prisma.js';
import { projectService, VALID_PROJECT_STATUSES } from './services/project.service.js';
import { stageService, VALID_STAGE_STATUSES } from './services/stage.service.js';
import { updateLogService } from './services/update-log.service.js';
import { memberService } from './services/member.service.js';
import { taskService, VALID_STATUSES } from './services/task.service.js';
import { subtaskService } from './services/subtask.service.js';
import { ValidationError, NotFoundError } from './services/errors.js';

/*
 * ============================================================================
 * BrainBoard V2 Architecture & Data Access Contract Preservation:
 * Business logic and database operations are segregated in domain services:
 * - projectService: Projects with businessLogic, githubRepo, settings
 * - stageService: Stages (milestones) belonging to projects
 * - updateLogService: Rich Markdown logs belonging to projects
 * - memberService: Team members belonging to projects
 * - taskService: Tasks belonging to stages
 * - subtaskService: Subtasks belonging to tasks
 * ============================================================================
 */

export {
  prisma,
  projectService,
  stageService,
  updateLogService,
  memberService,
  taskService,
  subtaskService,
};

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// Configuração e Fábrica do Servidor MCP
// ==========================================
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'brainboard-mcp',
      version: '2.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Registrar as ferramentas do MCP
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
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
          name: 'create_task',
          description: 'Cria uma nova tarefa associada a um Stage (etapa).',
          inputSchema: {
            type: 'object',
            properties: {
              stageId: { type: 'string', description: 'ID da etapa (stage) à qual a tarefa pertence.' },
              title: { type: 'string', description: 'Título da tarefa.' },
              description: { type: 'string', description: 'Descrição detalhada da tarefa.' },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Status inicial.' },
            },
            required: ['stageId', 'title'],
          },
        },
        {
          name: 'add_task',
          description: 'Alias de create_task para adicionar tarefa a um Stage.',
          inputSchema: {
            type: 'object',
            properties: {
              stageId: { type: 'string', description: 'ID da etapa (stage) à qual a tarefa pertence.' },
              title: { type: 'string', description: 'Título da tarefa.' },
              description: { type: 'string', description: 'Descrição detalhada da tarefa.' },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Status inicial.' },
            },
            required: ['stageId', 'title'],
          },
        },
        {
          name: 'move_task',
          description: 'Altera o status de uma tarefa ou a reatribui a outra etapa.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da tarefa a mover.' },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Novo status.' },
              stageId: { type: 'string', description: 'ID opcional do novo Stage se estiver movendo entre etapas.' },
            },
            required: ['id', 'status'],
          },
        },
        {
          name: 'update_task_status',
          description: 'Alias de move_task para alterar o status de uma tarefa.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da tarefa a mover.' },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Novo status.' },
              stageId: { type: 'string', description: 'ID opcional da nova etapa.' },
            },
            required: ['id', 'status'],
          },
        },
        {
          name: 'add_subtask',
          description: 'Adiciona uma subtarefa a uma tarefa existente.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: { type: 'string', description: 'ID da tarefa pai.' },
              title: { type: 'string', description: 'Título da subtarefa.' },
            },
            required: ['taskId', 'title'],
          },
        },
        {
          name: 'toggle_subtask',
          description: 'Alterna ou define o status de conclusão de uma subtarefa.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da subtarefa.' },
              isDone: { type: 'boolean', description: 'Opcional. Se omitido, inverte o status atual.' },
            },
            required: ['id'],
          },
        },
        {
          name: 'update_task',
          description: 'Atualiza título, descrição, status ou etapa de uma tarefa.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da tarefa.' },
              title: { type: 'string', description: 'Novo título da tarefa.' },
              description: { type: 'string', description: 'Nova descrição da tarefa.' },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Novo status.' },
              stageId: { type: 'string', description: 'ID da nova etapa.' },
            },
            required: ['id'],
          },
        },
        {
          name: 'delete_task',
          description: 'Exclui uma tarefa e suas subtarefas associadas.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da tarefa a excluir.' },
            },
            required: ['id'],
          },
        },
        {
          name: 'delete_subtask',
          description: 'Exclui uma subtarefa existente.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da subtarefa a excluir.' },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_tasks',
          description: 'Lista tarefas com filtros opcionais de etapa (stageId) e status.',
          inputSchema: {
            type: 'object',
            properties: {
              stageId: { type: 'string', description: 'Filtrar por ID da etapa.' },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
            },
          },
        },
        {
          name: 'get_task',
          description: 'Obtém os detalhes completos de uma tarefa específica por ID com subtarefas.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da tarefa.' },
            },
            required: ['id'],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'read_project_context') {
      const projectId = String(args?.projectId ?? '').trim();
      if (!projectId) {
        throw new Error('projectId é obrigatório');
      }

      const project = await projectService.getProjectById(projectId);
      if (!project) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Projeto não encontrado com o ID: ${projectId}` }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
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
            type: 'text',
            text: `Lógica de negócio do projeto ${projectId} atualizada com sucesso.`,
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
        githubRepo: args?.githubRepo !== undefined ? (args.githubRepo ? String(args.githubRepo).trim() : null) : undefined,
        settings: args?.settings !== undefined ? args.settings : undefined,
        businessLogic: args?.businessLogic !== undefined ? String(args.businessLogic) : undefined,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Configurações do projeto ${projectId} atualizadas com sucesso.`,
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
        content: [{ type: 'text', text: `Log de atualização criado com sucesso: ${log.id}` }],
      };
    }

    if (name === 'create_task' || name === 'add_task') {
      const stageId = String(args?.stageId ?? '').trim();
      const title = String(args?.title ?? '').trim();

      if (!stageId) {
        throw new Error('stageId é obrigatório');
      }
      if (!title) {
        throw new Error('title é obrigatório');
      }

      const task = await taskService.createTask({
        stageId,
        title,
        description: args?.description ? String(args.description).trim() : null,
        status: args?.status as any,
      });

      return {
        content: [{ type: 'text', text: `Tarefa criada com sucesso: ${task.id}` }],
      };
    }

    if (name === 'move_task' || name === 'update_task_status') {
      const id = String(args?.id ?? '').trim();
      const status = args?.status as any;
      const stageId = args?.stageId ? String(args.stageId).trim() : undefined;

      if (!id) {
        throw new Error('id é obrigatório');
      }
      if (!status) {
        throw new Error('status é obrigatório');
      }

      const task = await taskService.updateTask(id, {
        status,
        ...(stageId ? { stageId } : {}),
      });

      return {
        content: [{ type: 'text', text: `Tarefa movida para ${task.status}` }],
      };
    }

    if (name === 'add_subtask') {
      const taskId = String(args?.taskId ?? '').trim();
      const title = String(args?.title ?? '').trim();

      if (!taskId || !title) {
        throw new Error('taskId e title são obrigatórios');
      }

      const subtask = await subtaskService.createSubtask(taskId, title);

      return {
        content: [{ type: 'text', text: `Subtarefa criada com sucesso: ${subtask.id}` }],
      };
    }

    if (name === 'toggle_subtask') {
      const id = String(args?.id ?? '').trim();
      if (!id) {
        throw new Error('id é obrigatório');
      }

      const subtask = await subtaskService.toggleSubtask(
        id,
        typeof args?.isDone === 'boolean' ? Boolean(args.isDone) : undefined
      );

      return {
        content: [
          {
            type: 'text',
            text: `Subtarefa ${subtask.id} marcada como ${subtask.isDone ? 'concluída' : 'pendente'}`,
          },
        ],
      };
    }

    if (name === 'update_task') {
      const id = String(args?.id ?? '').trim();
      if (!id) {
        throw new Error('id é obrigatório');
      }

      const task = await taskService.updateTask(id, {
        title: args?.title ? String(args.title).trim() : undefined,
        description:
          args?.description !== undefined
            ? args.description
              ? String(args.description).trim()
              : null
            : undefined,
        status: args?.status as any,
        stageId: args?.stageId ? String(args.stageId).trim() : undefined,
      });

      return {
        content: [{ type: 'text', text: `Tarefa ${task.id} atualizada com sucesso` }],
      };
    }

    if (name === 'delete_task') {
      const id = String(args?.id ?? '').trim();
      if (!id) {
        throw new Error('id é obrigatório');
      }

      await taskService.deleteTask(id);

      return {
        content: [{ type: 'text', text: `Tarefa ${id} excluída com sucesso` }],
      };
    }

    if (name === 'delete_subtask') {
      const id = String(args?.id ?? '').trim();
      if (!id) {
        throw new Error('id é obrigatório');
      }

      await subtaskService.deleteSubtask(id);

      return {
        content: [{ type: 'text', text: `Subtarefa ${id} excluída com sucesso` }],
      };
    }

    if (name === 'list_tasks') {
      const filters: any = {};
      if (args?.stageId) filters.stageId = String(args.stageId).trim();
      if (args?.status) filters.status = args.status;

      const tasks = await taskService.listTasks(filters);

      return {
        content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
      };
    }

    if (name === 'get_task') {
      const id = String(args?.id ?? '').trim();
      if (!id) {
        throw new Error('id é obrigatório');
      }

      const task = await taskService.getTaskById(id);
      if (!task) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Tarefa não encontrada com o ID: ${id}` }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(task, null, 2) }],
      };
    }

    throw new Error(`Tool unknown: ${name}`);
  });

  return server;
}

// Servidor padrão MCP para exportação/compatibilidade
export const mcpServer = createMcpServer();

// Map de sessões SSE ativas para suporte a múltiplos clientes simultâneos
export const sseTransports = new Map<string, SSEServerTransport>();

app.get('/mcp/sse', async (req, res) => {
  console.log('Cliente conectou ao SSE');
  const transport = new SSEServerTransport('/mcp/messages', res as any);
  sseTransports.set(transport.sessionId, transport);

  const server = createMcpServer();

  res.on('close', () => {
    console.log(`Cliente desconectou do SSE: ${transport.sessionId}`);
    sseTransports.delete(transport.sessionId);
    server.close().catch(() => {});
  });

  await server.connect(transport);
});

app.post('/mcp/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sessionId
    ? sseTransports.get(sessionId)
    : sseTransports.values().next().value;

  if (transport) {
    await transport.handlePostMessage(req, res as any, req.body);
  } else {
    res.status(404).json({ error: 'MCP session not found' });
  }
});

// ==========================================
// Rotas da API REST (Para o Frontend e Orquestração)
// ==========================================

// GET /api/health: Verificação de integridade e liveness do container
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------
// PROJETOS
// ------------------------------------------

// GET /api/projects: Listar projetos com filtro de status opcional
app.get('/api/projects', async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !VALID_PROJECT_STATUSES.includes(status as any)) {
      return res.status(400).json({
        error: `Invalid project status: ${status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
      });
    }

    const projects = await projectService.listProjects({
      status: status as string,
    });
    res.json(projects);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id: Obter projeto por ID com etapas, tarefas, logs e membros
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects: Criar novo projeto
app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, businessLogic, status, githubRepo, settings } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (status !== undefined && !VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid project status: ${status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
      });
    }

    const project = await projectService.createProject({
      title,
      description,
      businessLogic,
      status,
      githubRepo,
      settings,
    });
    res.status(201).json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:id: Atualizar projeto
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, businessLogic, status, githubRepo, settings } = req.body;

    if (status !== undefined && !VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid project status: ${status}. Must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`,
      });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const project = await projectService.updateProject(id, {
      title,
      description,
      businessLogic,
      status,
      githubRepo,
      settings,
    });
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:id/business-logic: Atualizar lógica de negócio do projeto
app.patch('/api/projects/:id/business-logic', async (req, res) => {
  try {
    const { id } = req.params;
    const { businessLogic } = req.body;
    if (businessLogic === undefined || typeof businessLogic !== 'string') {
      return res.status(400).json({ error: 'businessLogic string is required' });
    }

    const project = await projectService.updateBusinessLogic(id, businessLogic);
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:id/settings: Atualizar configurações do projeto
app.patch('/api/projects/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { githubRepo, settings, businessLogic } = req.body;

    const project = await projectService.updateProjectSettings(id, {
      githubRepo,
      settings,
      businessLogic,
    });
    res.json(project);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:id: Excluir projeto (cascata deleta etapas, tarefas, subtarefas, logs, membros)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await projectService.deleteProject(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------
// STAGES (ETAPAS)
// ------------------------------------------

// GET /api/projects/:projectId/stages: Listar etapas de um projeto
app.get('/api/projects/:projectId/stages', async (req, res) => {
  try {
    const { projectId } = req.params;
    const stages = await stageService.listStagesByProject(projectId);
    res.json(stages);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/stages: Criar etapa em um projeto
app.post('/api/projects/:projectId/stages', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, order, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status !== undefined && !VALID_STAGE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid stage status: ${status}. Must be one of: ${VALID_STAGE_STATUSES.join(', ')}`,
      });
    }

    const stage = await stageService.createStage({
      projectId,
      title,
      order: typeof order === 'number' ? order : undefined,
      status,
    });
    res.status(201).json(stage);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stages/:id: Obter etapa por ID
app.get('/api/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const stage = await stageService.getStageById(id);
    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.json(stage);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/stages/:id: Atualizar etapa
app.patch('/api/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, order, status } = req.body;

    if (status !== undefined && !VALID_STAGE_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid stage status: ${status}. Must be one of: ${VALID_STAGE_STATUSES.join(', ')}`,
      });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const stage = await stageService.updateStage(id, {
      title,
      order,
      status,
    });
    res.json(stage);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/stages/:id: Excluir etapa (cascata deleta tarefas e subtarefas)
app.delete('/api/stages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await stageService.deleteStage(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------
// UPDATE LOGS (DIÁRIOS DE BORDO)
// ------------------------------------------

// GET /api/projects/:projectId/update-logs: Listar logs de atualização de um projeto
app.get('/api/projects/:projectId/update-logs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;

    const logs = await updateLogService.listLogsByProject(projectId, limit);
    res.json(logs);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/update-logs: Criar novo log de atualização
app.post('/api/projects/:projectId/update-logs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, content, author } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const log = await updateLogService.createLog({
      projectId,
      title,
      content,
      author,
    });
    res.status(201).json(log);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/update-logs/:id: Obter log por ID
app.get('/api/update-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const log = await updateLogService.getLogById(id);
    if (!log) {
      return res.status(404).json({ error: 'UpdateLog not found' });
    }
    res.json(log);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/update-logs/:id: Excluir log
app.delete('/api/update-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await updateLogService.deleteLog(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'UpdateLog not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------
// MEMBERS (MEMBROS DA EQUIPE)
// ------------------------------------------

// GET /api/projects/:projectId/members: Listar membros de um projeto
app.get('/api/projects/:projectId/members', async (req, res) => {
  try {
    const { projectId } = req.params;
    const members = await memberService.listMembersByProject(projectId);
    res.json(members);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/members: Adicionar membro ao projeto
app.post('/api/projects/:projectId/members', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, role, email } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!role || typeof role !== 'string' || !role.trim()) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const member = await memberService.createMember({
      projectId,
      name,
      role,
      email,
    });
    res.status(201).json(member);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/members/:id: Obter membro por ID
app.get('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const member = await memberService.getMemberById(id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/members/:id: Atualizar membro
app.patch('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, email } = req.body;

    const member = await memberService.updateMember(id, {
      name,
      role,
      email,
    });
    res.json(member);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/members/:id: Excluir membro
app.delete('/api/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await memberService.deleteMember(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------
// TASKS (TAREFAS)
// ------------------------------------------

// GET /api/tasks: Listar tarefas com filtros opcionais de etapa (stageId) e status
app.get('/api/tasks', async (req, res) => {
  try {
    const { stageId, status } = req.query;

    if (status && !VALID_STATUSES.includes(status as any)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const tasks = await taskService.listTasks({
      stageId: stageId ? String(stageId).trim() : undefined,
      status: status as string,
    });
    res.json(tasks);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/stages/:stageId/tasks: Listar tarefas pertencentes a uma etapa específica
app.get('/api/stages/:stageId/tasks', async (req, res) => {
  try {
    const { stageId } = req.params;
    const tasks = await taskService.listTasks({ stageId });
    res.json(tasks);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:id: Obter tarefa específica por ID com suas subtarefas
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks: Criar nova tarefa informando stageId no corpo
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, stageId, description, status } = req.body;
    if (!stageId || typeof stageId !== 'string' || !stageId.trim()) {
      return res.status(400).json({ error: 'stageId is required' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const task = await taskService.createTask({
      stageId: stageId.trim(),
      title: title.trim(),
      description: description ? String(description).trim() : null,
      status,
    });
    res.status(201).json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/stages/:stageId/tasks: Criar nova tarefa vinculada à etapa pela URL
app.post('/api/stages/:stageId/tasks', async (req, res) => {
  try {
    const { stageId } = req.params;
    const { title, description, status } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const task = await taskService.createTask({
      stageId,
      title: title.trim(),
      description: description ? String(description).trim() : null,
      status,
    });
    res.status(201).json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id: Atualizar status, título, descrição ou stageId da tarefa
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, stageId } = req.body;

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const task = await taskService.updateTask(id, {
      status,
      title,
      description,
      stageId,
    });
    res.json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2025' || error.code === 'P2003'))) {
      return res.status(404).json({ error: 'Task or Stage not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id/status: Alias para atualizar status da tarefa
app.patch('/api/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const task = await taskService.updateTask(id, { status });
    res.json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id: Excluir tarefa (cascata deleta subtarefas)
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await taskService.deleteTask(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------
// SUBTASKS (SUBTAREFAS)
// ------------------------------------------

// POST /api/tasks/:id/subtasks: Criar subtarefa vinculada à tarefa
app.post('/api/tasks/:id/subtasks', async (req, res) => {
  try {
    const { id: taskId } = req.params;
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const subtask = await subtaskService.createSubtask(taskId, title);
    res.status(201).json(subtask);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && (error.code === 'P2003' || error.code === 'P2025'))) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/subtasks/:id: Alternar ou atualizar status da subtarefa
app.patch('/api/subtasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isDone = typeof req.body.isDone === 'boolean' ? req.body.isDone : undefined;
    const subtask = await subtaskService.toggleSubtask(id, isDone);
    res.json(subtask);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/subtasks/:id/toggle: Alias para alternar status da subtarefa
app.patch('/api/subtasks/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const isDone = typeof req.body.isDone === 'boolean' ? req.body.isDone : undefined;
    const subtask = await subtaskService.toggleSubtask(id, isDone);
    res.json(subtask);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/subtasks/:id: Excluir subtarefa
app.delete('/api/subtasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await subtaskService.deleteSubtask(id);
    res.status(204).send();
  } catch (error: any) {
    if (error instanceof NotFoundError || (error && typeof error === 'object' && 'code' in error && error.code === 'P2025')) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Inicialização do servidor Express
app.listen(port, () => {
  console.log(`Backend BrainBoard V2 rodando em http://localhost:${port}`);
  console.log(`MCP Endpoint SSE: http://localhost:${port}/mcp/sse`);
});

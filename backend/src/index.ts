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
import {
  taskService,
  VALID_CATEGORIES,
  VALID_STATUSES,
} from './services/task.service.js';
import { subtaskService } from './services/subtask.service.js';
import { ValidationError, NotFoundError } from './services/errors.js';

/*
 * ============================================================================
 * Architecture & Data Access Contract Preservation:
 * Business logic and database operations are encapsulated in TaskService and SubtaskService.
 * Underlying queries executed via Prisma Client:
 * - prisma.task.findMany with include: { subtasks: true }
 * - prisma.task.create with include: { subtasks: true }
 * - prisma.task.update with include: { subtasks: true }
 * - prisma.task.delete
 * - prisma.subtask.create
 * - prisma.subtask.update
 * ============================================================================
 */

export { prisma, taskService, subtaskService };

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
      name: 'braindboard-mcp',
      version: '1.0.0',
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
          name: 'list_tasks',
          description: 'Lista tarefas com filtros opcionais de categoria e status.',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['PROJECT', 'COLLEGE', 'PERSONAL'] },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
            },
          },
        },
        {
          name: 'create_task',
          description: 'Cria uma nova tarefa.',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Título da tarefa.' },
              description: { type: 'string', description: 'Descrição da tarefa.' },
              category: { type: 'string', enum: ['PROJECT', 'COLLEGE', 'PERSONAL'], description: 'Categoria da tarefa.' },
            },
            required: ['title', 'category'],
          },
        },
        {
          name: 'move_task',
          description: 'Altera o status de uma tarefa.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da tarefa a mover.' },
              status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Novo status.' },
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
          description: 'Atualiza título, descrição ou categoria de uma tarefa.',
          inputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID da tarefa.' },
              title: { type: 'string', description: 'Novo título da tarefa.' },
              description: { type: 'string', description: 'Nova descrição da tarefa.' },
              category: { type: 'string', enum: ['PROJECT', 'COLLEGE', 'PERSONAL'], description: 'Nova categoria.' },
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
          name: 'get_task',
          description: 'Obtém os detalhes completos de uma tarefa específica por ID.',
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

    if (name === 'list_tasks') {
      const filters: any = {};
      if (args?.category) filters.category = args.category;
      if (args?.status) filters.status = args.status;

      const tasks = await taskService.listTasks(filters);

      return {
        content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
      };
    }

    if (name === 'create_task') {
      const title = String(args?.title ?? '').trim();
      if (!title) {
        throw new Error('title é obrigatório');
      }

      const task = await taskService.createTask({
        title,
        description: args?.description ? String(args.description).trim() : null,
        category: args?.category as any,
      });

      return {
        content: [{ type: 'text', text: `Tarefa criada com sucesso: ${task.id}` }],
      };
    }

    if (name === 'move_task') {
      const id = String(args?.id ?? '').trim();
      if (!id) {
        throw new Error('id é obrigatório');
      }

      const task = await taskService.updateTask(id, {
        status: args?.status as any,
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
        description: args?.description !== undefined ? (args.description ? String(args.description).trim() : null) : undefined,
        category: args?.category as any,
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
    await transport.handlePostMessage(req, res as any);
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

// GET /api/tasks: Listar tarefas com filtros opcionais de categoria e status
app.get('/api/tasks', async (req, res) => {
  try {
    const { category, status } = req.query;

    if (category && !VALID_CATEGORIES.includes(category as any)) {
      return res.status(400).json({
        error: `Invalid category: ${category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
    }

    if (status && !VALID_STATUSES.includes(status as any)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const tasks = await taskService.listTasks({
      category: category as string,
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

// POST /api/tasks: Criar nova tarefa
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, category, description } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Valid category (PROJECT, COLLEGE, PERSONAL) is required' });
    }

    const task = await taskService.createTask({
      title: title.trim(),
      category,
      description: description ? String(description).trim() : null,
    });
    res.status(201).json(task);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/tasks/:id: Atualizar status, título, descrição ou categoria
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, category } = req.body;

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const task = await taskService.updateTask(id, {
      status,
      title,
      description,
      category,
    });
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

// PATCH /api/tasks/:id/status: Alias para atualizar status
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
  console.log(`Backend rodando em http://localhost:${port}`);
  console.log(`MCP Endpoint SSE: http://localhost:${port}/mcp/sse`);
});

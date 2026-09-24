import { taskService } from '../../projects/services/task.service.js';
import { subtaskService } from '../../projects/services/subtask.service.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const taskToolSchemas: Tool[] = [
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
        isSprintActive: { type: 'boolean', description: 'Se a tarefa deve ser incluída na Sprint atual ativa.' },
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
        isSprintActive: { type: 'boolean', description: 'Se a tarefa deve ser incluída na Sprint atual ativa.' },
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
        isSprintActive: { type: 'boolean', description: 'Adicionar ou remover da Sprint ativa.' },
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
        projectId: { type: 'string', description: 'Filtrar tarefas pelo ID do projeto.' },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
        isSprintActive: { type: 'boolean', description: 'Listar apenas tarefas que estão na Sprint Semanal (true) ou apenas as que não estão (false).' },
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
];

export async function handleTaskTools(name: string, args: any) {
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
      status: args?.status,
      isSprintActive: args?.isSprintActive !== undefined ? Boolean(args.isSprintActive) : undefined,
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Tarefa criada com sucesso.', id: task.id, task }, null, 2) }],
    };
  }

  if (name === 'move_task' || name === 'update_task_status') {
    const id = String(args?.id ?? '').trim();
    const status = args?.status;
    const stageId = args?.stageId ? String(args.stageId).trim() : undefined;

    if (!id || !status) {
      throw new Error('id e status são obrigatórios');
    }

    const task = await taskService.updateTask(id, {
      status,
      stageId,
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: `Tarefa movida para ${task.status}.`, id: task.id, task }, null, 2) }],
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
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: 'Subtarefa criada com sucesso.', id: subtask.id, subtask }, null, 2) }],
    };
  }

  if (name === 'toggle_subtask') {
    const id = String(args?.id ?? '').trim();
    if (!id) {
      throw new Error('id é obrigatório');
    }

    const isDone = typeof args?.isDone === 'boolean' ? args.isDone : undefined;
    const subtask = await subtaskService.toggleSubtask(id, isDone);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: `Subtarefa ${subtask.id} marcada como ${subtask.isDone ? 'concluída' : 'pendente'}.`, id: subtask.id, subtask }, null, 2),
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
      status: args?.status,
      stageId: args?.stageId ? String(args.stageId).trim() : undefined,
      isSprintActive: args?.isSprintActive !== undefined ? Boolean(args.isSprintActive) : undefined,
    });

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: `Tarefa ${task.id} atualizada com sucesso.`, id: task.id, task }, null, 2) }],
    };
  }

  if (name === 'delete_task') {
    const id = String(args?.id ?? '').trim();
    if (!id) {
      throw new Error('id é obrigatório');
    }

    await taskService.deleteTask(id);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: `Tarefa ${id} excluída com sucesso.`, id }, null, 2) }],
    };
  }

  if (name === 'delete_subtask') {
    const id = String(args?.id ?? '').trim();
    if (!id) {
      throw new Error('id é obrigatório');
    }

    await subtaskService.deleteSubtask(id);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: true, message: `Subtarefa ${id} excluída com sucesso.`, id }, null, 2) }],
    };
  }

  if (name === 'list_tasks') {
    const filters: any = {};
    if (args?.stageId) filters.stageId = String(args.stageId).trim();
    if (args?.projectId) filters.projectId = String(args.projectId).trim();
    if (args?.status) filters.status = args.status;
    if (args?.isSprintActive !== undefined) filters.isSprintActive = Boolean(args.isSprintActive);

    const tasks = await taskService.listTasks(filters);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(tasks, null, 2) }],
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
        content: [{ type: 'text' as const, text: `Tarefa não encontrada com o ID: ${id}` }],
      };
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(task, null, 2) }],
    };
  }

  return null;
}

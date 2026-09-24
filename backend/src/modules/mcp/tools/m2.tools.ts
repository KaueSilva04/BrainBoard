import { appointmentService } from '../../calendar/appointment.service.js';
import { taskService } from '../../projects/services/task.service.js';
import { prisma } from '../../../prisma.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const m2ToolSchemas: Tool[] = [
  {
    name: 'create_appointment',
    description: 'Cria um novo compromisso com horário de início e término no calendário.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título do compromisso.' },
        startTime: {
          type: 'string',
          description: 'Data/hora de início (formato ISO-8601, ex: 2026-09-20T14:00:00Z).',
        },
        endTime: {
          type: 'string',
          description: 'Data/hora de término (formato ISO-8601, ex: 2026-09-20T15:00:00Z).',
        },
        description: { type: 'string', description: 'Descrição detalhada do compromisso (opcional).' },
        locationOrLink: { type: 'string', description: 'Local físico ou link da reunião (opcional).' },
      },
      required: ['title', 'startTime', 'endTime'],
    },
  },
  {
    name: 'list_upcoming_deadlines',
    description: 'Consulta prazos, entregas de projetos/disciplinas e compromissos da semana.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Número de dias à frente para busca (padrão: 7).' },
        projectId: { type: 'string', description: 'Filtrar por ID do projeto específico (opcional).' },
        includeCompleted: { type: 'boolean', description: 'Incluir itens concluídos (padrão: false).' },
      },
    },
  },
  {
    name: 'add_to_sprint',
    description: 'Adiciona ou remove uma tarefa da Sprint ativa semanal.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'ID da tarefa.' },
        isSprintActive: {
          type: 'boolean',
          description: 'Se verdadeiro, adiciona à Sprint; se falso, remove (padrão: true).',
        },
        isActive: { type: 'boolean', description: 'Alias para isSprintActive (padrão: true).' },
      },
      required: ['taskId'],
    },
  },
];

export async function handleM2Tools(name: string, args: any) {
  if (name === 'create_appointment') {
    const title = String(args?.title ?? '').trim();
    const startTimeStr = String(args?.startTime ?? '').trim();
    const endTimeStr = String(args?.endTime ?? '').trim();

    if (!title) throw new Error('title é obrigatório');
    if (!startTimeStr || !endTimeStr) throw new Error('startTime e endTime são obrigatórios');

    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) throw new Error('Datas inválidas');
    if (startTime >= endTime) throw new Error('startTime deve ser anterior a endTime');

    const apt = await appointmentService.createAppointment({
      title,
      startTime,
      endTime,
      description: args?.description ? String(args.description).trim() : null,
      locationOrLink: args?.locationOrLink ? String(args.locationOrLink).trim() : null,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: `Compromisso agendado com sucesso.`, id: apt.id, appointment: apt }, null, 2),
        },
      ],
    };
  }

  if (name === 'list_upcoming_deadlines') {
    const days = typeof args?.days === 'number' && args.days > 0 ? args.days : 7;
    const projectId = args?.projectId ? String(args.projectId).trim() : undefined;
    const includeCompleted = Boolean(args?.includeCompleted);
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: futureDate },
        ...(includeCompleted ? {} : { status: { not: 'DONE' } }),
        ...(projectId ? { stage: { projectId } } : {}),
      },
      include: { stage: { include: { project: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: now, lte: futureDate },
        ...(includeCompleted ? {} : { isCompleted: false }),
      },
      orderBy: { startTime: 'asc' },
    });

    const result = {
      queryWindow: { days, from: now.toISOString(), to: futureDate.toISOString() },
      totalUpcoming: tasks.length + appointments.length,
      deadlines: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate?.toISOString(),
        status: t.status,
        project: t.stage.project.title,
        projectType: t.stage.project.type,
        stage: t.stage.title,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        title: a.title,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
        locationOrLink: a.locationOrLink,
        isCompleted: a.isCompleted,
      })),
    };

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  }

  if (name === 'add_to_sprint') {
    const taskId = String(args?.taskId ?? '').trim();
    if (!taskId) throw new Error('taskId é obrigatório');

    const isSprintActive =
      args?.isSprintActive !== undefined
        ? Boolean(args.isSprintActive)
        : args?.isActive !== undefined
        ? Boolean(args.isActive)
        : true;

    const task = await taskService.updateTask(taskId, { isSprintActive });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, message: `Tarefa ${task.id} ${task.isSprintActive ? 'adicionada à' : 'removida da'} Sprint ativa com sucesso.`, id: task.id, task }, null, 2),
        },
      ],
    };
  }

  return null;
}

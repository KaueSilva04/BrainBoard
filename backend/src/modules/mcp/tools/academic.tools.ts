import { academicService } from '../../academic/academic.service.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const academicToolSchemas: Tool[] = [
  {
    name: 'list_subjects',
    description: 'Lista todas as disciplinas acadêmicas cadastradas.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_subject',
    description: 'Cria uma nova disciplina acadêmica.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da disciplina.' },
        description: { type: 'string', description: 'Descrição da disciplina.' },
        professor: { type: 'string', description: 'Nome do professor responsável.' },
        colorCode: { type: 'string', description: 'Cor em HEX para identificação (ex: #3B82F6).' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_assignment',
    description: 'Cria uma nova atividade/avaliação acadêmica para uma disciplina.',
    inputSchema: {
      type: 'object',
      properties: {
        subjectId: { type: 'string', description: 'ID da disciplina.' },
        title: { type: 'string', description: 'Título da atividade.' },
        description: { type: 'string', description: 'Instruções ou escopo.' },
        type: { type: 'string', enum: ['EXAM', 'HOMEWORK', 'PROJECT', 'PRESENTATION', 'READING', 'OTHER'], description: 'Tipo de atividade.' },
        dueDate: { type: 'string', description: 'Data de entrega no formato ISO 8601 (ex: 2024-12-01T10:00:00Z).' },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Status (padrão: TODO).' },
      },
      required: ['subjectId', 'title', 'type'],
    },
  },
  {
    name: 'update_assignment_status',
    description: 'Atualiza o status de uma atividade acadêmica.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID da atividade.' },
        status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'], description: 'Novo status.' },
      },
      required: ['id', 'status'],
    },
  },
];

export async function handleAcademicTools(name: string, args: any) {
  if (name === 'list_subjects') {
    const subjects = await academicService.listSubjects();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(subjects, null, 2) }],
    };
  }

  if (name === 'create_subject') {
    const title = String(args?.title ?? '').trim();
    if (!title) throw new Error('title é obrigatório');
    
    const subject = await academicService.createSubject({
      title,
      description: args?.description ? String(args.description) : undefined,
      professor: args?.professor ? String(args.professor) : undefined,
      colorCode: args?.colorCode ? String(args.colorCode) : undefined,
    });
    
    return {
      content: [{ type: 'text' as const, text: `Disciplina criada com sucesso. ID: ${subject.id}` }],
    };
  }

  if (name === 'create_assignment') {
    const subjectId = String(args?.subjectId ?? '').trim();
    const title = String(args?.title ?? '').trim();
    const type = String(args?.type ?? '').trim();
    if (!subjectId || !title || !type) throw new Error('subjectId, title e type são obrigatórios');

    const assignment = await academicService.createAssignment({
      subjectId,
      title,
      type: type as any,
      description: args?.description ? String(args.description) : undefined,
      dueDate: args?.dueDate ? String(args.dueDate) : undefined,
      status: args?.status ? (args.status as any) : undefined,
    });

    return {
      content: [{ type: 'text' as const, text: `Atividade '${assignment.title}' criada com sucesso. ID: ${assignment.id}` }],
    };
  }

  if (name === 'update_assignment_status') {
    const id = String(args?.id ?? '').trim();
    const status = String(args?.status ?? '').trim();
    if (!id || !status) throw new Error('id e status são obrigatórios');

    const assignment = await academicService.updateAssignment(id, { status: status as any });
    return {
      content: [{ type: 'text' as const, text: `Status atualizado com sucesso. Novo status: ${assignment.status}` }],
    };
  }

  return null;
}

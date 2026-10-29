import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Loader2,
  Calendar,
  Flame,
  User,
  Tag,
  Plus,
  Layers,
  Trash2,
  CheckSquare,
  Pencil,
  Clock,
  PlayCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import type { Task, Stage, TaskStatus, ProjectCollaborator, UpdateTaskInput } from '../types';
import { TASK_STATUS_LABELS, PRESET_TASK_TAGS, getTagBadgeClasses, getTaskTags } from '../types';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { tasksApi } from '../services/api';
import { SubtaskItem } from './SubtaskItem';
import { getInitials } from './collaborators/AvatarStack';

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  stages?: Stage[];
  collaborators?: ProjectCollaborator[];
  onTaskUpdated?: (updatedTask: Task) => void;
  onDeleteTask?: (taskId: string) => Promise<void>;
  initialEditMode?: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  stages = [],
  collaborators = [],
  onTaskUpdated,
  onDeleteTask,
  initialEditMode = false,
}) => {
  const dialogRef = useAccessibleModal<HTMLDivElement>(isOpen, onClose);

  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stageId, setStageId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [dueDate, setDueDate] = useState('');
  const [isSprintActive, setIsSprintActive] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [subtasks, setSubtasks] = useState(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const syncFromTask = (currentTask: Task) => {
    setTitle(currentTask.title || '');
    setDescription(currentTask.description || '');
    setStageId(currentTask.stageId || (stages[0]?.id ?? ''));
    setStatus(currentTask.status || 'TODO');
    setDueDate(currentTask.dueDate ? currentTask.dueDate.split('T')[0] : '');
    setIsSprintActive(Boolean(currentTask.isSprintActive));
    setAssigneeId(currentTask.assigneeId || '');
    setTags(getTaskTags(currentTask));
    setSubtasks(currentTask.subtasks || []);
    setErrorMessage('');
  };

  useEffect(() => {
    if (!task || !isOpen) return;
    setIsEditing(Boolean(initialEditMode));
    syncFromTask(task);
  }, [task, isOpen, initialEditMode, stages]);

  if (!isOpen || !task) return null;

  const statusBadgeStyles: Record<TaskStatus, { badge: string; icon: React.ReactNode }> = {
    TODO: {
      badge:
        'bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70',
      icon: <Clock className="h-3.5 w-3.5" />,
    },
    IN_PROGRESS: {
      badge:
        'bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70',
      icon: <PlayCircle className="h-3.5 w-3.5" />,
    },
    DONE: {
      badge:
        'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
  };

  const currentStageTitle =
    stages.find((s) => s.id === (stageId || task.stageId))?.title ||
    task.stage?.title ||
    'Sem etapa';

  const currentAssignee = assigneeId
    ? collaborators.find((c) => c.userId === assigneeId) ||
      (task.assignee && task.assignee.id === assigneeId
        ? {
            userId: task.assignee.id,
            name: task.assignee.name,
            email: task.assignee.email,
            avatarColor: task.assignee.avatarColor,
          }
        : null)
    : null;

  const formattedDueDate = dueDate
    ? new Date(`${dueDate}T12:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const handleToggleTag = (tag: string) => {
    const clean = tag.trim().replace(/^#/, '');
    if (!clean) return;
    setTags((prev) => (prev.includes(clean) ? prev.filter((t) => t !== clean) : [...prev, clean]));
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
      setCustomTagInput('');
    }
  };

  const handleAddSubtask = async () => {
    const clean = newSubtaskTitle.trim();
    if (!clean || isAddingSubtask) return;
    setIsAddingSubtask(true);
    try {
      const created = await tasksApi.addSubtask(task.id, clean);
      const nextSubtasks = [...subtasks, created];
      setSubtasks(nextSubtasks);
      setNewSubtaskTitle('');
      onTaskUpdated?.({ ...task, subtasks: nextSubtasks });
    } catch (err) {
      console.error('Failed to add subtask', err);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isDone: boolean) => {
    const nextSubtasks = subtasks.map((s) => (s.id === subtaskId ? { ...s, isDone } : s));
    setSubtasks(nextSubtasks);
    try {
      await tasksApi.toggleSubtask(subtaskId, isDone);
      onTaskUpdated?.({ ...task, subtasks: nextSubtasks });
    } catch (err) {
      console.error('Failed to toggle subtask', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const nextSubtasks = subtasks.filter((s) => s.id !== subtaskId);
    setSubtasks(nextSubtasks);
    try {
      await tasksApi.deleteSubtask(subtaskId);
      onTaskUpdated?.({ ...task, subtasks: nextSubtasks });
    } catch (err) {
      console.error('Failed to delete subtask', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('O título da tarefa é obrigatório.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');

    const payload: UpdateTaskInput = {
      title: title.trim(),
      description: description.trim() || null,
      stageId: stageId || undefined,
      status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      isSprintActive,
      assigneeId: assigneeId || null,
      tags,
    };

    try {
      const updated = await tasksApi.update(task.id, payload);
      const chosenAssignee = assigneeId
        ? collaborators.find((c) => c.userId === assigneeId)
        : null;
      const fullUpdated: Task = {
        ...updated,
        subtasks,
        assignee: chosenAssignee
          ? {
              id: chosenAssignee.userId,
              name: chosenAssignee.name,
              email: chosenAssignee.email || '',
              avatarColor: chosenAssignee.avatarColor,
            }
          : null,
        stage: stages.find((s) => s.id === (payload.stageId || task.stageId)) || task.stage,
      };
      onTaskUpdated?.(fullUpdated);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save task changes:', err);
      setErrorMessage(err.message || 'Erro ao salvar alterações da tarefa.');
    } finally {
      setIsSaving(false);
    }
  };

  const doneSubtasksCount = subtasks.filter((s) => s.isDone).length;
  const subtaskProgress =
    subtasks.length > 0 ? Math.round((doneSubtasksCount / subtasks.length) * 100) : 0;

  const modalContent = (
    <div
      className="bb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        tabIndex={-1}
        className="bb-dialog-panel relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                statusBadgeStyles[status]?.badge || statusBadgeStyles.TODO.badge
              }`}
            >
              {statusBadgeStyles[status]?.icon}
              <span>{TASK_STATUS_LABELS[status]}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              <span className="truncate max-w-[200px]">{currentStageTitle}</span>
            </span>

            {isSprintActive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-300">
                <Flame className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>Em Foco</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Pencil className="h-3.5 w-3.5 text-indigo-500" />
                <span>Editar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* VIEW MODE */}
        {!isEditing ? (
          <>
            <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-7">
              {/* Task Title */}
              <div>
                <h2
                  id="task-detail-title"
                  className={`text-xl font-extrabold leading-snug tracking-tight sm:text-2xl ${
                    status === 'DONE'
                      ? 'text-slate-400 line-through dark:text-slate-500'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {title}
                </h2>
              </div>

              {/* Metadata Summary Cards */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs border border-slate-200/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <User className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Responsável</p>
                    {currentAssignee ? (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ backgroundColor: currentAssignee.avatarColor || '#334155' }}
                        >
                          {getInitials(currentAssignee.name)}
                        </span>
                        <span className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                          {currentAssignee.name}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Não atribuído
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs border border-slate-200/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Prazo de entrega</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {formattedDueDate || 'Sem prazo definido'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-xs border border-slate-200/70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Flame
                      className={`h-4 w-4 ${
                        isSprintActive ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Foco Global</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isSprintActive ? 'Ativo no foco' : 'Fora do foco'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Tag className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Etiquetas</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tags.map((tg) => (
                      <span
                        key={tg}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getTagBadgeClasses(
                          tg
                        )}`}
                      >
                        #{tg}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Description */}
              <div className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Descrição</span>
                </h3>
                <div className="min-h-[96px] rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200 whitespace-pre-wrap break-words">
                  {description.trim() ? (
                    description
                  ) : (
                    <span className="italic text-slate-400 dark:text-slate-500">
                      Nenhuma descrição informada para esta tarefa. Clique em "Editar" para adicionar detalhes.
                    </span>
                  )}
                </div>
              </div>

              {/* Subtasks */}
              <div className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <CheckSquare className="h-4 w-4 text-indigo-500" />
                    <span>
                      Subtarefas ({doneSubtasksCount}/{subtasks.length})
                    </span>
                  </h3>
                  {subtasks.length > 0 && (
                    <span className="bb-tabular font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                      {subtaskProgress}%
                    </span>
                  )}
                </div>

                {subtasks.length > 0 && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        subtaskProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${subtaskProgress}%` }}
                    />
                  </div>
                )}

                {subtasks.length > 0 ? (
                  <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                    {subtasks.map((st) => (
                      <SubtaskItem
                        key={st.id}
                        subtask={st}
                        onToggle={handleToggleSubtask}
                        onDelete={handleDeleteSubtask}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Nenhuma subtarefa cadastrada.
                  </p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Adicionar nova subtarefa..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddSubtask();
                      }
                    }}
                    className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddSubtask()}
                    disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/60 dark:text-indigo-400"
                  >
                    {isAddingSubtask ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* View Mode Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
              {onDeleteTask ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
                      await onDeleteTask(task.id);
                      onClose();
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Excluir tarefa</span>
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Editar tarefa</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* EDIT MODE */
          <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-5 overflow-y-auto p-6 sm:p-7 text-xs sm:text-sm">
              {errorMessage && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                  {errorMessage}
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="task-title"
                  id="task-detail-title"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Título da Tarefa *
                </label>
                <input
                  id="task-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label htmlFor="task-desc" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Descrição Completa
                </label>
                <textarea
                  id="task-desc"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Adicione notas, contexto ou especificações..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                />
              </div>

              {/* Grid: Stage, Status, Due Date, Assignee */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {stages.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Etapa</span>
                    </label>
                    <select
                      value={stageId}
                      onChange={(e) => setStageId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {stages.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="TODO">{TASK_STATUS_LABELS.TODO}</option>
                    <option value="IN_PROGRESS">{TASK_STATUS_LABELS.IN_PROGRESS}</option>
                    <option value="DONE">{TASK_STATUS_LABELS.DONE}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Prazo de Entrega</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate('')}
                        className="h-10 rounded-lg px-2 text-xs text-slate-400 hover:text-rose-500"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                    <span>Responsável</span>
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="">Sem responsável</option>
                    {collaborators.map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.name} ({c.email || 'Membro'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sprint Focus Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <Flame
                    className={`h-4 w-4 ${
                      isSprintActive ? 'fill-amber-500 text-amber-500' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Foco Global (Sprint Ativo)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Destaca esta tarefa no painel de foco global e métricas de prioridade.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSprintActive}
                  onClick={() => setIsSprintActive(!isSprintActive)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    isSprintActive ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      isSprintActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Tag className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Etiquetas (Tags)</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from(new Set([...PRESET_TASK_TAGS, ...tags])).map((tg) => {
                    const active = tags.includes(tg);
                    return (
                      <button
                        key={tg}
                        type="button"
                        onClick={() => handleToggleTag(tg)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                          active
                            ? getTagBadgeClasses(tg)
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <span>#{tg}</span>
                        {active && <X className="h-2.5 w-2.5" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Criar nova tag personalizada..."
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="h-8 max-w-xs flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="h-8 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Adicionar Tag
                  </button>
                </div>
              </div>
            </div>

            {/* Edit Mode Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
              {onDeleteTask ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
                      await onDeleteTask(task.id);
                      onClose();
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Excluir Tarefa</span>
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    syncFromTask(task);
                    setIsEditing(false);
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { Task, Stage, TaskStatus, ProjectCollaborator, UpdateTaskInput } from '../types';
import { TASK_STATUS_LABELS, PRESET_TASK_TAGS, getTagBadgeClasses, getTaskTags } from '../types';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { tasksApi } from '../services/api';
import { SubtaskItem } from './SubtaskItem';

export interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  stages?: Stage[];
  collaborators?: ProjectCollaborator[];
  onTaskUpdated?: (updatedTask: Task) => void;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  stages = [],
  collaborators = [],
  onTaskUpdated,
  onDeleteTask,
}) => {
  const dialogRef = useAccessibleModal<HTMLDivElement>(isOpen, onClose);

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

  useEffect(() => {
    if (!task || !isOpen) return;
    setTitle(task.title || '');
    setDescription(task.description || '');
    setStageId(task.stageId || (stages[0]?.id ?? ''));
    setStatus(task.status || 'TODO');
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    setIsSprintActive(Boolean(task.isSprintActive));
    setAssigneeId(task.assigneeId || '');
    setTags(getTaskTags(task));
    setSubtasks(task.subtasks || []);
    setErrorMessage('');
  }, [task, isOpen, stages]);

  if (!isOpen || !task) return null;

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
      setSubtasks((prev) => [...prev, created]);
      setNewSubtaskTitle('');
    } catch (err) {
      console.error('Failed to add subtask', err);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isDone: boolean) => {
    setSubtasks((prev) => prev.map((s) => (s.id === subtaskId ? { ...s, isDone } : s)));
    try {
      await tasksApi.toggleSubtask(subtaskId, isDone);
    } catch (err) {
      console.error('Failed to toggle subtask', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    try {
      await tasksApi.deleteSubtask(subtaskId);
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
      onClose();
    } catch (err: any) {
      console.error('Failed to save task changes:', err);
      setErrorMessage(err.message || 'Erro ao salvar alterações da tarefa.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="bb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        tabIndex={-1}
        className="bb-dialog-panel relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <h2 id="task-detail-title" className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Detalhes da Tarefa
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 space-y-5 overflow-y-auto p-6 text-xs sm:text-sm">
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Título da Tarefa *
            </label>
            <input
              id="task-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Descrição Completa
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione notas, contexto ou especificações..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-900 outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900 resize-y"
            />
          </div>

          {/* Grid: Stage, Status, Assignee, Due Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Stage */}
            {stages.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Etapa</span>
                </label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="TODO">{TASK_STATUS_LABELS.TODO}</option>
                <option value="IN_PROGRESS">{TASK_STATUS_LABELS.IN_PROGRESS}</option>
                <option value="DONE">{TASK_STATUS_LABELS.DONE}</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Prazo de Entrega</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="h-9 rounded-lg px-2 text-xs text-slate-400 hover:text-rose-500"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>Responsável</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
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
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <Flame className={`h-4 w-4 ${isSprintActive ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Foco Global (Sprint Ativo)</p>
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
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

          {/* Subtasks Section */}
          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <CheckSquare className="h-4 w-4 text-indigo-500" />
                <span>Subtarefas ({subtasks.filter((s) => s.isDone).length}/{subtasks.length})</span>
              </span>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {subtasks.map((st) => (
                  <SubtaskItem
                    key={st.id}
                    subtask={st}
                    onToggle={handleToggleSubtask}
                    onDelete={handleDeleteSubtask}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Adicionar subtarefa..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="h-8 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-50 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400"
              >
                {isAddingSubtask ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
            {onDeleteTask ? (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
                    await onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir Tarefa</span>
              </button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Salvar Alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

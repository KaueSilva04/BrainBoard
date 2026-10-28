import React, { useState } from 'react';
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Loader2,
  CheckSquare,
  Flame,
  Calendar,
  User,
  Check,
  GripVertical,
  Milestone,
} from 'lucide-react';
import type { Task, TaskStatus, Stage, ProjectCollaborator, AuthUser } from '../types';
import { TASK_STATUS_LABELS } from '../types';
import { SubtaskItem } from './SubtaskItem';
import { tasksApi } from '../services/api';
import { getInitials } from './collaborators/AvatarStack';

export interface TaskCardProps {
  task: Task;
  stageName?: string;
  stages?: Stage[];
  collaborators?: ProjectCollaborator[];
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onMoveTaskToStage?: (taskId: string, targetStageId: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onToggleSprint?: (id: string, isSprintActive: boolean) => Promise<void>;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  stageName,
  stages,
  collaborators,
  onMoveTask,
  onMoveTaskToStage,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onToggleSprint,
}) => {
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [isSprintActive, setIsSprintActive] = useState<boolean>(Boolean(task.isSprintActive));
  const [isTogglingSprint, setIsTogglingSprint] = useState(false);
  const [assignee, setAssignee] = useState<AuthUser | null | undefined>(task.assignee);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isStageMenuOpen, setIsStageMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleAssign = async (collab: ProjectCollaborator | null) => {
    setIsAssigning(true);
    try {
      const assigneeId = collab ? collab.userId : null;
      await tasksApi.update(task.id, { assigneeId });
      setAssignee(
        collab
          ? {
              id: collab.userId,
              name: collab.name,
              email: collab.email,
              avatarColor: collab.avatarColor,
            }
          : null
      );
      setIsAssigneeOpen(false);
    } catch (err) {
      console.error('Failed to update assignee:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const statusConfig: Record<
    TaskStatus,
    {
      iconBox: string;
      badge: string;
      icon: React.ReactNode;
    }
  > = {
    TODO: {
      iconBox: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/70',
      badge: 'bg-amber-100/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70',
      icon: <Clock className="w-4 h-4" />,
    },
    IN_PROGRESS: {
      iconBox: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/70',
      badge: 'bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70',
      icon: <PlayCircle className="w-4 h-4" />,
    },
    DONE: {
      iconBox: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/70',
      badge: 'bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/70',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
  };

  const completedSubtasks = task.subtasks?.filter((st) => st.isDone).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progressPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleMove = async (newStatus: TaskStatus) => {
    if (isMoving) return;
    setIsMoving(true);
    try {
      await onMoveTask(task.id, newStatus);
    } finally {
      setIsMoving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    if (window.confirm(`Excluir a tarefa "${task.title}" e suas subtarefas?`)) {
      setIsDeleting(true);
      try {
        await onDeleteTask(task.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = subtaskTitle.trim();
    if (!title || isAddingSubtask) return;

    setIsAddingSubtask(true);
    try {
      await onAddSubtask(task.id, title);
      setSubtaskTitle('');
      setShowSubtaskForm(false);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSprint = async () => {
    if (isTogglingSprint) return;
    const nextVal = !isSprintActive;
    setIsTogglingSprint(true);
    setIsSprintActive(nextVal);
    try {
      if (onToggleSprint) {
        await onToggleSprint(task.id, nextVal);
      } else {
        await tasksApi.toggleSprint(task.id, nextVal);
      }
    } catch (err) {
      console.error('Failed to toggle sprint state:', err);
      setIsSprintActive(!nextVal);
    } finally {
      setIsTogglingSprint(false);
    }
  };

  // Format date or relative days
  const now = new Date();
  let dateDisplay = '';
  let isOverdue = false;

  if (task.dueDate) {
    const due = new Date(task.dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      dateDisplay = `Atrasado (${Math.abs(diffDays)}d)`;
      isOverdue = true;
    } else if (diffDays === 0) {
      dateDisplay = 'Entrega hoje';
    } else if (diffDays === 1) {
      dateDisplay = 'Amanhã';
    } else {
      dateDisplay = `${diffDays} dias restantes`;
    }
  } else {
    const taskDate = new Date(task.createdAt);
    const diffDays = Math.max(0, Math.floor((now.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24)));
    dateDisplay =
      diffDays === 0
        ? 'Criado hoje'
        : diffDays === 1
        ? 'Criado ontem'
        : `Criado há ${diffDays}d`;
  }

  const currentStatusConfig = statusConfig[task.status] || statusConfig.TODO;
  const resolvedStageName =
    stageName || stages?.find((s) => s.id === task.stageId)?.title || task.stage?.title;

  const handleMoveStage = async (targetStageId: string) => {
    if (!onMoveTaskToStage || targetStageId === task.stageId || isMoving) {
      setIsStageMenuOpen(false);
      return;
    }
    setIsMoving(true);
    setIsStageMenuOpen(false);
    try {
      await onMoveTaskToStage(task.id, targetStageId);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.setData('application/x-brainboard-task', JSON.stringify({ id: task.id, stageId: task.stageId, status: task.status }));
        e.dataTransfer.effectAllowed = 'move';
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={`bb-panel bb-card-motion group relative space-y-4 p-4 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-50 scale-[0.98] ring-2 ring-indigo-500/50' : ''
      }`}
    >
      {/* Top Header: Status Icon Box + Badge & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Drag Grip + Status Icon Box */}
          <div className="flex items-center gap-1">
            <GripVertical
              className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-400 shrink-0 transition-colors"
              aria-hidden="true"
            />
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60 ${currentStatusConfig.iconBox}`}
            >
              {currentStatusConfig.icon}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${currentStatusConfig.badge}`}
              >
                {TASK_STATUS_LABELS[task.status]}
              </span>
              {resolvedStageName && (
                <div className="relative">
                  {stages && stages.length > 1 && onMoveTaskToStage ? (
                    <button
                      type="button"
                      onClick={() => setIsStageMenuOpen(!isStageMenuOpen)}
                      title="Clique para mover para outra etapa"
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-700 dark:hover:text-indigo-400 transition-colors"
                    >
                      <Milestone className="w-3 h-3" />
                      <span>{resolvedStageName}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      {resolvedStageName}
                    </span>
                  )}

                  {isStageMenuOpen && stages && stages.length > 1 && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Mover para etapa
                      </div>
                      {stages.map((st) => {
                        const isCurrent = st.id === task.stageId;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => void handleMoveStage(st.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
                          >
                            <span className="truncate text-left">{st.title}</span>
                            {isCurrent && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {/* Quick Sprint Active Toggle Badge */}
              <button
                type="button"
                onClick={handleToggleSprint}
                disabled={isTogglingSprint}
                title={isSprintActive ? 'Remover do foco' : 'Adicionar ao foco'}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                  isSprintActive
                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/70 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                    : 'text-slate-400 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-transparent hover:border-amber-200 dark:hover:border-amber-800/70'
                }`}
              >
                {isTogglingSprint ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Flame className={`w-3 h-3 ${isSprintActive ? 'text-amber-600 dark:text-amber-400 fill-amber-500' : ''}`} />
                )}
                <span>{isSprintActive ? 'Foco' : '+Foco'}</span>
              </button>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium">
              {task.dueDate ? (
                <span
                  className={`inline-flex items-center gap-1 ${
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : task.status === 'DONE'
                      ? 'text-slate-400 dark:text-slate-400'
                      : 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{dateDisplay}</span>
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                  <span>{dateDisplay}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete button (Trash2 / onDeleteTask) */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Excluir tarefa"
          className="rounded-lg p-1.5 text-slate-400 dark:text-slate-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-500 dark:hover:text-rose-400"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400 dark:text-slate-400" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Task Title & Description */}
      <div>
        <h4
          className={`text-base font-semibold leading-snug tracking-tight transition-colors ${
            task.status === 'DONE'
              ? 'text-slate-400 dark:text-slate-400 line-through font-normal'
              : 'text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
          }`}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm font-normal leading-relaxed text-slate-500 dark:text-slate-400">
            {task.description}
          </p>
        )}
      </div>

      {/* Assignee indicator & quick switcher */}
      <div className="relative flex items-center justify-between text-xs">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
            aria-label="Alterar responsável"
            disabled={isAssigning}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            {isAssigning ? (
              <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
            ) : assignee ? (
              <>
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ backgroundColor: assignee.avatarColor || '#334155' }}
                >
                  {getInitials(assignee.name)}
                </span>
                <span className="truncate max-w-[120px]">{assignee.name}</span>
              </>
            ) : (
              <>
                <User className="h-3 w-3 text-slate-400" />
                <span className="text-slate-400">+ Atribuir</span>
              </>
            )}
          </button>

          {isAssigneeOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Responsável
              </div>
              <button
                type="button"
                onClick={() => void handleAssign(null)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
              >
                <span>Não atribuído</span>
                {!assignee && <Check className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />}
              </button>
              {collaborators && collaborators.length > 0 && (
                <div className="mt-1 border-t border-slate-100 dark:border-slate-700 pt-1">
                  {collaborators.map((c) => {
                    const isSelected = assignee?.id === c.userId;
                    return (
                      <button
                        key={c.userId}
                        type="button"
                        onClick={() => void handleAssign(c)}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                            style={{ backgroundColor: c.avatarColor || '#334155' }}
                          >
                            {getInitials(c.name)}
                          </span>
                          <span className="truncate text-left">{c.name}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-slate-900 dark:text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subtasks & Progress Bar Section */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
            <span>Subtarefas</span>
            <span className="bb-tabular font-mono font-bold text-slate-800 dark:text-slate-200">
              {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setShowSubtaskForm(!showSubtaskForm)}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 font-semibold text-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Adicionar</span>
          </button>
        </div>

        {/* Subtask Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPercent === 100
                ? 'bg-emerald-500'
                : 'bg-indigo-500'
            }`}
            style={{ width: `${totalSubtasks > 0 ? progressPercent : 0}%` }}
          />
        </div>

        {/* Subtask list with checkboxes and isDone */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {task.subtasks.map((st) => (
              <SubtaskItem
                key={st.id}
                subtask={st}
                onToggle={onToggleSubtask}
                onDelete={onDeleteSubtask}
              />
            ))}
          </div>
        )}

        {/* Inline Add Subtask Input Form (subtaskTitle / Nova subtarefa) */}
        {showSubtaskForm && (
          <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 pt-1.5">
            <input
              type="text"
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Nova subtarefa..."
              autoFocus
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={isAddingSubtask || !subtaskTitle.trim()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
            >
              {isAddingSubtask ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSubtaskForm(false);
                setSubtaskTitle('');
              }}
              className="px-2 py-1.5 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </form>
        )}
      </div>

      {/* Movement Action Buttons */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
        {task.status === 'TODO' && (
          <button
            type="button"
            onClick={() => handleMove('IN_PROGRESS')}
            disabled={isMoving}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70 transition-colors"
          >
            {isMoving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <span>Iniciar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}

        {task.status === 'IN_PROGRESS' && (
          <>
            <button
              type="button"
              onClick={() => handleMove('TODO')}
              disabled={isMoving}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={() => handleMove('DONE')}
              disabled={isMoving}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 transition-colors"
            >
              <span>Concluir</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {task.status === 'DONE' && (
          <button
            type="button"
            onClick={() => handleMove('IN_PROGRESS')}
            disabled={isMoving}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
          >
            {isMoving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Reabrir</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

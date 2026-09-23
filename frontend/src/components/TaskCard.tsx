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
} from 'lucide-react';
import type { Task, TaskStatus } from '../types';
import { TASK_STATUS_LABELS } from '../types';
import { SubtaskItem } from './SubtaskItem';
import { tasksApi } from '../services/api';

export interface TaskCardProps {
  task: Task;
  stageName?: string;
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onToggleSprint?: (id: string, isSprintActive: boolean) => Promise<void>;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  stageName,
  onMoveTask,
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

  const statusConfig: Record<
    TaskStatus,
    {
      iconBox: string;
      badge: string;
      icon: React.ReactNode;
    }
  > = {
    TODO: {
      iconBox: 'bg-amber-50 text-amber-600 border border-amber-200/80',
      badge: 'bg-amber-100/70 text-amber-800 border border-amber-200/80',
      icon: <Clock className="w-4 h-4" />,
    },
    IN_PROGRESS: {
      iconBox: 'bg-indigo-50 text-indigo-600 border border-indigo-200/80',
      badge: 'bg-indigo-100/70 text-indigo-800 border border-indigo-200/80',
      icon: <PlayCircle className="w-4 h-4" />,
    },
    DONE: {
      iconBox: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
      badge: 'bg-emerald-100/70 text-emerald-800 border border-emerald-200/80',
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

  return (
    <div className="group relative bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-indigo-200/90 transition-all duration-200 space-y-4">
      {/* Top Header: Status Icon Box + Badge & Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Status Icon Box */}
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${currentStatusConfig.iconBox}`}
          >
            {currentStatusConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${currentStatusConfig.badge}`}
              >
                {TASK_STATUS_LABELS[task.status]}
              </span>
              {stageName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  {stageName}
                </span>
              )}
              {/* Quick Sprint Active Toggle Badge */}
              <button
                type="button"
                onClick={handleToggleSprint}
                disabled={isTogglingSprint}
                title={isSprintActive ? 'Remover da Sprint Semanal' : 'Adicionar à Sprint Semanal'}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                  isSprintActive
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 shadow-2xs'
                    : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200'
                }`}
              >
                {isTogglingSprint ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Flame className={`w-3 h-3 ${isSprintActive ? 'text-amber-600 fill-amber-500' : ''}`} />
                )}
                <span>{isSprintActive ? 'Sprint' : '+Sprint'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] mt-0.5 font-medium">
              {task.dueDate ? (
                <span
                  className={`inline-flex items-center gap-1 ${
                    isOverdue
                      ? 'text-rose-600 font-bold'
                      : task.status === 'DONE'
                      ? 'text-slate-400'
                      : 'text-indigo-600 font-semibold'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{dateDisplay}</span>
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
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
          className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Task Title & Description */}
      <div>
        <h4
          className={`text-sm font-bold leading-snug tracking-tight transition-colors ${
            task.status === 'DONE'
              ? 'text-slate-400 line-through font-normal'
              : 'text-slate-900 group-hover:text-indigo-600'
          }`}
        >
          {task.title}
        </h4>
        {task.description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
            {task.description}
          </p>
        )}
      </div>

      {/* Subtasks & Progress Bar Section */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="flex items-center gap-1.5 text-slate-600">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Subtarefas</span>
            <span className="font-bold text-slate-800">
              {totalSubtasks > 0 && `(${completedSubtasks}/${totalSubtasks})`}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setShowSubtaskForm(!showSubtaskForm)}
            className="text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 font-semibold text-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Adicionar</span>
          </button>
        </div>

        {/* Colorful Gradient Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
              progressPercent === 100
                ? 'from-emerald-400 to-teal-500'
                : 'from-indigo-500 via-purple-500 to-pink-500'
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
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={isAddingSubtask || !subtaskTitle.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1 shadow-xs"
            >
              {isAddingSubtask ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSubtaskForm(false);
                setSubtaskTitle('');
              }}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 text-xs rounded-lg hover:bg-slate-100"
            >
              ✕
            </button>
          </form>
        )}
      </div>

      {/* Movement Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {task.status === 'TODO' && (
          <button
            type="button"
            onClick={() => handleMove('IN_PROGRESS')}
            disabled={isMoving}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all shadow-xs"
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
              className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={() => handleMove('DONE')}
              disabled={isMoving}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all shadow-xs"
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
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
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

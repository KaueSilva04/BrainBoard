import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  PlayCircle,
  Calendar,
  Layers,
  RefreshCw,
  MinusCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
} from 'lucide-react';
import { tasksApi } from '../../services/api';
import type { Task, TaskStatus } from '../../types';
import { AddToSprintModal } from './AddToSprintModal';
import { SubtaskItem } from '../SubtaskItem';
import { getInitials } from '../collaborators/AvatarStack';

export interface SprintKanbanViewProps {
  onOpenCreateTask?: () => void;
  onNavigateToProjects?: () => void;
  onRetryProjects?: () => void;
  hasProjectsSnapshot?: boolean;
  projectsLoadError?: boolean;
  projectsCount?: number;
  projectId?: string;
}

export const SprintKanbanView: React.FC<SprintKanbanViewProps> = ({
  onOpenCreateTask,
  onNavigateToProjects,
  onRetryProjects,
  hasProjectsSnapshot = false,
  projectsLoadError = false,
  projectsCount = 0,
  projectId,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasTasksSnapshot, setHasTasksSnapshot] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddToSprintOpen, setIsAddToSprintOpen] = useState<boolean>(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Subtask management inline state
  const [activeSubtaskFormId, setActiveSubtaskFormId] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState<string>('');
  const [isAddingSubtask, setIsAddingSubtask] = useState<boolean>(false);

  const loadSprintTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await tasksApi.listAll({ isSprintActive: true, projectId });
      setTasks(data);
      setHasTasksSnapshot(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load sprint tasks:', err);
      setError('Não foi possível atualizar as tarefas marcadas para foco.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSprintTasks();
  }, [loadSprintTasks]);

  // Handle move task status
  const handleMoveTask = async (task: Task, newStatus: TaskStatus) => {
    if (movingTaskId) return;
    setMovingTaskId(task.id);
    const prevTasks = tasks;

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksApi.updateStatus(task.id, newStatus);
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      setTasks(prevTasks);
      alert('Erro ao atualizar status da tarefa.');
    } finally {
      setMovingTaskId(null);
    }
  };

  // Handle remove from sprint
  const handleRemoveFromSprint = async (taskId: string) => {
    if (removingTaskId) return;
    setRemovingTaskId(taskId);
    const prevTasks = tasks;

    // Optimistic UI removal
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await tasksApi.toggleSprint(taskId, false);
    } catch (err: any) {
      console.error('Failed to remove task from sprint:', err);
      setTasks(prevTasks);
      alert('Erro ao remover tarefa da sprint.');
    } finally {
      setRemovingTaskId(null);
    }
  };

  // Subtask actions
  const handleAddSubtask = async (taskId: string) => {
    const clean = subtaskTitle.trim();
    if (!clean || isAddingSubtask) return;

    setIsAddingSubtask(true);
    try {
      const newSubtask = await tasksApi.addSubtask(taskId, clean);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
            : t
        )
      );
      setSubtaskTitle('');
      setActiveSubtaskFormId(null);
    } catch (err) {
      console.error('Failed to add subtask:', err);
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, isDone: boolean) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: (t.subtasks || []).map((st) =>
          st.id === subtaskId ? { ...st, isDone } : st
        ),
      }))
    );
    try {
      await tasksApi.toggleSubtask(subtaskId, isDone);
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
      loadSprintTasks(true);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: (t.subtasks || []).filter((st) => st.id !== subtaskId),
      }))
    );
    try {
      await tasksApi.deleteSubtask(subtaskId);
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      loadSprintTasks(true);
    }
  };

  // KPIs
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const hasVerifiedMetrics = hasTasksSnapshot;

  // Search filter
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.stage?.title && t.stage.title.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  // Tasks grouped by status
  const columns: { status: TaskStatus; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
    {
      status: 'TODO',
      label: 'A Fazer',
      icon: <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      color: 'border-amber-400',
      bg: 'bg-amber-50/50 dark:bg-amber-950/50',
    },
    {
      status: 'IN_PROGRESS',
      label: 'Em Andamento',
      icon: <PlayCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
      color: 'border-indigo-400',
      bg: 'bg-indigo-50/50 dark:bg-indigo-950/50',
    },
    {
      status: 'DONE',
      label: 'Concluído',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
      color: 'border-emerald-400',
      bg: 'bg-emerald-50/50 dark:bg-emerald-950/50',
    },
  ];

  // Helper for due date badge
  const renderDueDateBadge = (dueDateStr?: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    let text = `${diffDays} dias restantes`;

    if (diffDays < 0) {
      badgeClass = 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70 font-bold';
      text = `Atrasado (${Math.abs(diffDays)}d)`;
    } else if (diffDays === 0) {
      badgeClass = 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 font-bold';
      text = 'Entrega hoje!';
    } else if (diffDays === 1) {
      badgeClass = 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70';
      text = 'Amanhã';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] border ${badgeClass}`}>
        <Calendar className="w-3 h-3" />
        <span>{text}</span>
      </span>
    );
  };

  return (
    <div className="bb-page-stack bb-page-enter motion-reduce:animate-none">
      {/* Top Banner & KPI Section */}
      <div className={`bb-panel ${projectId ? 'p-3 sm:p-6' : 'p-5 sm:p-6'}`}>
        <div className={`flex flex-col md:flex-row md:items-center justify-between ${projectId ? 'gap-3 sm:gap-6' : 'gap-6'}`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className={`rounded-2xl bg-amber-500 text-white flex items-center justify-center border border-amber-400/40 ${projectId ? 'h-9 w-9 sm:h-10 sm:w-10' : 'h-10 w-10'}`}>
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {projectId ? 'Foco do projeto' : 'Foco global'}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {projectId ? 'Tarefas marcadas para foco neste projeto' : 'Tarefas marcadas para foco nos projetos'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadSprintTasks(false)}
              title="Atualizar tarefas de foco"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsAddToSprintOpen(true)}
              className="flex h-10 items-center gap-2 rounded-lg bg-amber-700 px-4 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-amber-800"
            >
              <Flame className="w-4 h-4" />
              <span>+ Adicionar ao foco</span>
            </button>

            {projectId && onOpenCreateTask && (
              <button
                onClick={onOpenCreateTask}
                className="flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nova Tarefa</span>
              </button>
            )}
          </div>
        </div>

        {!projectId && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm text-indigo-950 dark:border-indigo-900/70 dark:bg-indigo-950/40 dark:text-indigo-100 sm:flex-row sm:items-center sm:justify-between">
            {!hasProjectsSnapshot ? (
              <>
                <p role="status" className="min-w-0">
                  {projectsLoadError
                    ? 'Os projetos ainda não estão disponíveis. Tente carregar novamente para criar uma tarefa em um projeto.'
                    : 'Os projetos ainda não foram carregados; eles são necessários para criar uma tarefa.'}
                </p>
                {onRetryProjects && (
                  <button type="button" onClick={onRetryProjects} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 font-semibold text-indigo-800 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200 dark:hover:bg-indigo-950">
                    <RefreshCw className="h-4 w-4" />Tentar novamente
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="min-w-0">
                  {projectsCount > 0
                    ? 'Para criar uma tarefa, escolha um projeto e uma etapa. O foco reúne tarefas já marcadas nos projetos.'
                    : 'Ainda não há projetos para receber tarefas. Abra Projetos para criar ou selecionar um projeto.'}
                </p>
                {onNavigateToProjects && (
                  <button type="button" onClick={onNavigateToProjects} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-indigo-700 px-3 font-semibold text-white hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:bg-indigo-600 dark:hover:bg-indigo-500 dark:focus-visible:ring-offset-slate-900">
                    {projectsCount > 0 ? 'Escolher projeto' : 'Abrir projetos'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Sprint KPIs Bar */}
        {!hasVerifiedMetrics && error ? (
          <p role="status" className="mt-6 border-t border-slate-100 pt-4 text-sm text-rose-700 dark:border-slate-700 dark:text-rose-300">
            Métricas indisponíveis até que as tarefas sejam carregadas.
          </p>
        ) : (
        <div className={`grid grid-cols-2 border-t border-slate-100 dark:border-slate-700 ${projectId ? 'gap-2 mt-4 pt-4 sm:gap-4 sm:mt-6 sm:pt-6' : 'gap-4 mt-6 pt-6'} sm:grid-cols-4`}>
          <div className={`rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 ${projectId ? 'p-2.5 sm:p-3.5' : 'p-3.5'}`}>
            <p className={`font-medium text-slate-500 dark:text-slate-400 ${projectId ? 'text-[10px] sm:text-[11px]' : 'text-xs'}`}>Total em foco</p>
            <p className={`bb-tabular font-mono font-black text-slate-900 dark:text-slate-100 mt-0.5 ${projectId ? 'text-xl sm:text-2xl' : 'text-2xl'}`}>{hasVerifiedMetrics ? totalCount : '—'}</p>
          </div>
          <div className={`rounded-2xl bg-amber-50/60 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800/70 ${projectId ? 'p-2.5 sm:p-3.5' : 'p-3.5'}`}>
            <p className={`font-medium text-amber-600 dark:text-amber-400 ${projectId ? 'text-[10px] sm:text-[11px]' : 'text-xs'}`}>A fazer</p>
            <p className={`bb-tabular font-mono font-black text-amber-700 dark:text-amber-300 mt-0.5 ${projectId ? 'text-xl sm:text-2xl' : 'text-2xl'}`}>{hasVerifiedMetrics ? todoCount : '—'}</p>
          </div>
          <div className={`rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/70 ${projectId ? 'p-2.5 sm:p-3.5' : 'p-3.5'}`}>
            <p className={`font-medium text-indigo-600 dark:text-indigo-400 ${projectId ? 'text-[10px] sm:text-[11px]' : 'text-xs'}`}>Em andamento</p>
            <p className={`bb-tabular font-mono font-black text-indigo-700 dark:text-indigo-300 mt-0.5 ${projectId ? 'text-xl sm:text-2xl' : 'text-2xl'}`}>{hasVerifiedMetrics ? inProgressCount : '—'}</p>
          </div>
          <div className={`rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-800/70 ${projectId ? 'p-2.5 sm:p-3.5' : 'p-3.5'}`}>
            <div className="flex items-center justify-between">
              <p className={`font-medium text-emerald-600 dark:text-emerald-400 ${projectId ? 'text-[10px] sm:text-[11px]' : 'text-xs'}`}>Taxa de conclusão</p>
              <span className="bb-tabular font-mono text-xs font-black text-emerald-700 dark:text-emerald-300">{hasVerifiedMetrics ? `${completionRate}%` : '—'}</span>
            </div>
            <p className={`bb-tabular font-mono font-black text-emerald-700 dark:text-emerald-300 mt-0.5 ${projectId ? 'text-xl sm:text-2xl' : 'text-2xl'}`}>{hasVerifiedMetrics ? `${doneCount} / ${totalCount}` : '—'}</p>
            {hasVerifiedMetrics && <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/50 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>}
          </div>
        </div>
        )}
        {!hasVerifiedMetrics && loading && <p role="status" className="mt-3 text-xs text-slate-500 dark:text-slate-400">Carregando métricas do quadro de foco…</p>}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar tarefas em foco..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400" role={!hasTasksSnapshot && error ? 'status' : undefined}>
          {hasTasksSnapshot ? `Mostrando ${filteredTasks.length} ${filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}` : error ? 'Tarefas indisponíveis' : loading ? 'Carregando tarefas…' : 'Tarefas não carregadas'}
        </div>
      </div>

      {/* Error state */}
      {error && tasks.length > 0 && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button type="button"
            onClick={() => loadSprintTasks(false)}
            className="min-h-10 rounded-lg px-2 font-bold underline hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:text-rose-300"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando quadro de foco...</p>
        </div>
      ) : error && tasks.length === 0 ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <p>{error}</p>
          <button type="button" onClick={() => loadSprintTasks(false)} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-900"><RefreshCw className="h-4 w-4" />Tentar novamente</button>
        </div>
      ) : totalCount === 0 ? (
        <div className="bb-panel rounded-2xl p-12 text-center border-dashed space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200/60 dark:border-amber-800/60">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Nenhuma tarefa marcada para foco</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Adicione tarefas do backlog dos seus projetos para reuni-las neste quadro de foco.
            </p>
          </div>
          <button
            onClick={() => setIsAddToSprintOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl border border-amber-600/30 transition-colors motion-reduce:transition-none"
          >
            <Flame className="w-4 h-4" />
            <span>Adicionar tarefas ao foco</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverCol !== col.status) setDragOverCol(col.status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDragOverCol(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const droppedTaskId = e.dataTransfer.getData('text/plain');
                  const targetTask = tasks.find((t) => t.id === droppedTaskId);
                  if (targetTask && targetTask.status !== col.status) {
                    void handleMoveTask(targetTask, col.status);
                  }
                }}
                className={`bb-kanban-column rounded-2xl p-4 flex min-w-0 flex-col min-h-[280px] md:min-h-[500px] transition-all ${
                  dragOverCol === col.status
                    ? 'ring-2 ring-amber-500/70 bg-amber-50/40 dark:bg-amber-950/30 border-amber-400 dark:border-amber-500'
                    : ''
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{col.label}</h3>
                  </div>
                  <span className="bb-tabular font-mono px-2 py-0.5 rounded-full text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Tasks */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 dark:text-slate-400 text-xs font-medium">
                      Nenhuma tarefa neste status
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const totalSub = task.subtasks?.length || 0;
                      const doneSub = task.subtasks?.filter((s) => s.isDone).length || 0;
                      const subPercent = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
                      const isRemoving = removingTaskId === task.id;
                      const isMoving = movingTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggingTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragOverCol(null);
                          }}
                          className={`bb-panel bb-card-motion group space-y-3 p-4 hover:border-amber-300 dark:hover:border-amber-800/70 cursor-grab active:cursor-grabbing transition-all ${
                            draggingTaskId === task.id ? 'opacity-50 scale-[0.98] ring-2 ring-amber-500/50' : ''
                          }`}
                        >
                          {/* Card Header: Stage badge + Due Date & Remove button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {task.stage?.title && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/70">
                                  <Layers className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{task.stage.title}</span>
                                </span>
                              )}
                              {renderDueDateBadge(task.dueDate)}
                              {task.assignee && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                                  title={`Responsável: ${task.assignee.name}`}
                                >
                                  <span
                                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white"
                                    style={{ backgroundColor: task.assignee.avatarColor || '#334155' }}
                                  >
                                    {getInitials(task.assignee.name)}
                                  </span>
                                  <span className="truncate max-w-[80px]">{task.assignee.name.split(' ')[0]}</span>
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromSprint(task.id)}
                              disabled={isRemoving}
                              title="Remover do foco"
                              className="text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1 rounded-lg transition-colors"
                            >
                              {isRemoving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MinusCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Task Title & Description */}
                          <div>
                            <h4
                              className={`text-sm font-bold leading-snug ${
                                task.status === 'DONE'
                                  ? 'text-slate-400 dark:text-slate-400 line-through font-normal'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Subtasks Progress */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                                <CheckSquare className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                                <span>Subtarefas</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {totalSub > 0 && `(${doneSub}/${totalSub})`}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveSubtaskFormId(
                                    activeSubtaskFormId === task.id ? null : task.id
                                  )
                                }
                                className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-semibold text-[11px]"
                              >
                                + Adicionar
                              </button>
                            </div>

                            {totalSub > 0 && (
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    subPercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${subPercent}%` }}
                                />
                              </div>
                            )}

                            {/* Subtask list */}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className="space-y-1 max-h-28 overflow-y-auto pr-0.5 pt-1">
                                {task.subtasks.map((st) => (
                                  <SubtaskItem
                                    key={st.id}
                                    subtask={st}
                                    onToggle={handleToggleSubtask}
                                    onDelete={handleDeleteSubtask}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Inline Add Subtask Form */}
                            {activeSubtaskFormId === task.id && (
                              <div className="flex items-center gap-1.5 pt-1">
                                <input
                                  type="text"
                                  value={subtaskTitle}
                                  onChange={(e) => setSubtaskTitle(e.target.value)}
                                  placeholder="Nova subtarefa..."
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                      e.preventDefault();
                                      handleAddSubtask(task.id);
                                    }
                                  }}
                                  onBlur={() => {
                                    if (subtaskTitle.trim()) {
                                      handleAddSubtask(task.id);
                                    } else {
                                      setActiveSubtaskFormId(null);
                                      setSubtaskTitle('');
                                    }
                                  }}
                                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSubtask(task.id)}
                                  disabled={isAddingSubtask || !subtaskTitle.trim()}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                  {isAddingSubtask ? <Loader2 className="w-3 h-3 animate-spin" /> : 'OK'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSubtaskFormId(null);
                                    setSubtaskTitle('');
                                  }}
                                  className="p-1 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status Transition Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-1.5">
                            {task.status === 'TODO' && (
                              <button
                                type="button"
                                onClick={() => handleMoveTask(task, 'IN_PROGRESS')}
                                disabled={isMoving}
                                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70 transition-all"
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
                                  onClick={() => handleMoveTask(task, 'TODO')}
                                  disabled={isMoving}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                  <span>Voltar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(task, 'DONE')}
                                  disabled={isMoving}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 transition-all"
                                >
                                  <span>Concluir</span>
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            {task.status === 'DONE' && (
                              <button
                                type="button"
                                onClick={() => handleMoveTask(task, 'IN_PROGRESS')}
                                disabled={isMoving}
                                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all"
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
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add to Sprint Modal */}
      <AddToSprintModal
        isOpen={isAddToSprintOpen}
        onClose={() => setIsAddToSprintOpen(false)}
        onTaskAdded={() => loadSprintTasks(true)}
      />
    </div>
  );
};

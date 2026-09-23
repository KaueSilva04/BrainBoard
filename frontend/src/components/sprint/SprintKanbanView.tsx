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

export interface SprintKanbanViewProps {
  onOpenCreateTask?: () => void;
}

export const SprintKanbanView: React.FC<SprintKanbanViewProps> = ({ onOpenCreateTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAddToSprintOpen, setIsAddToSprintOpen] = useState<boolean>(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [removingTaskId, setRemovingTaskId] = useState<string | null>(null);

  // Subtask management inline state
  const [activeSubtaskFormId, setActiveSubtaskFormId] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState<string>('');
  const [isAddingSubtask, setIsAddingSubtask] = useState<boolean>(false);

  const loadSprintTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!silent) setError(null);
      const data = await tasksApi.listAll({ isSprintActive: true });
      setTasks(data);
    } catch (err: any) {
      console.error('Failed to load sprint tasks:', err);
      if (!silent) setError('Não foi possível carregar as tarefas da sprint semanal.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      color: 'border-amber-400',
      bg: 'bg-amber-50/50',
    },
    {
      status: 'IN_PROGRESS',
      label: 'Em Andamento',
      icon: <PlayCircle className="w-4 h-4 text-indigo-500" />,
      color: 'border-indigo-400',
      bg: 'bg-indigo-50/50',
    },
    {
      status: 'DONE',
      label: 'Concluído',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      color: 'border-emerald-400',
      bg: 'bg-emerald-50/50',
    },
  ];

  // Helper for due date badge
  const renderDueDateBadge = (dueDateStr?: string | null) => {
    if (!dueDateStr) return null;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let text = `${diffDays} dias restantes`;

    if (diffDays < 0) {
      badgeClass = 'bg-rose-100 text-rose-700 border-rose-200 font-bold';
      text = `Atrasado (${Math.abs(diffDays)}d)`;
    } else if (diffDays === 0) {
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
      text = 'Entrega hoje!';
    } else if (diffDays === 1) {
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & KPI Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Visão Global
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-widest">
                    Foco da Semana
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Quadro unificado exibindo suas prioridades ativas de todos os projetos
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadSprintTasks(false)}
              title="Atualizar tarefas globais"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsAddToSprintOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all active:scale-98"
            >
              <Flame className="w-4 h-4" />
              <span>+ Adicionar à Sprint</span>
            </button>

            {onOpenCreateTask && (
              <button
                onClick={onOpenCreateTask}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all active:scale-98"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nova Tarefa</span>
              </button>
            )}
          </div>
        </div>

        {/* Sprint KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total na Sprint</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">A Fazer</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">{todoCount}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Em Andamento</p>
            <p className="text-2xl font-black text-indigo-700 mt-0.5">{inProgressCount}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Taxa de Conclusão</p>
              <span className="text-xs font-black text-emerald-700">{completionRate}%</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{doneCount} / {totalCount}</p>
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar tarefas da sprint..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-xs"
          />
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Mostrando {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadSprintTasks(false)}
            className="font-bold underline hover:text-rose-800"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Carregando quadro da sprint...</p>
        </div>
      ) : totalCount === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-800">Sua Sprint Semanal está vazia</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Adicione tarefas do backlog dos seus projetos para acompanhar o progresso focado desta semana.
            </p>
          </div>
          <button
            onClick={() => setIsAddToSprintOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all"
          >
            <Flame className="w-4 h-4" />
            <span>Adicionar Tarefas do Backlog</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);

            return (
              <div
                key={col.status}
                className="bg-slate-50/80 rounded-3xl p-4 border border-slate-200/80 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60">
                  <div className="flex items-center gap-2">
                    {col.icon}
                    <h3 className="text-sm font-extrabold text-slate-800">{col.label}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-white text-slate-700 shadow-xs border border-slate-200">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Tasks */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs font-medium">
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
                          className="group bg-white rounded-2xl p-4 border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-amber-300 transition-all space-y-3"
                        >
                          {/* Card Header: Stage badge + Due Date & Remove button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {task.stage?.title && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  <Layers className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{task.stage.title}</span>
                                </span>
                              )}
                              {renderDueDateBadge(task.dueDate)}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFromSprint(task.id)}
                              disabled={isRemoving}
                              title="Remover da Sprint Semanal"
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors"
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
                                  ? 'text-slate-400 line-through font-normal'
                                  : 'text-slate-900'
                              }`}
                            >
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>

                          {/* Subtasks Progress */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-slate-500 font-medium">
                                <CheckSquare className="w-3 h-3 text-slate-400" />
                                <span>Subtarefas</span>
                                <span className="font-bold text-slate-700">
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
                                className="text-amber-600 hover:text-amber-700 font-semibold text-[11px]"
                              >
                                + Adicionar
                              </button>
                            </div>

                            {totalSub > 0 && (
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
                                    if (e.key === 'Enter') {
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
                                  className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
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
                                  className="p-1 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status Transition Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            {task.status === 'TODO' && (
                              <button
                                type="button"
                                onClick={() => handleMoveTask(task, 'IN_PROGRESS')}
                                disabled={isMoving}
                                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-all"
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
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                  <span>Voltar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveTask(task, 'DONE')}
                                  disabled={isMoving}
                                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all"
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
                                className="w-full flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
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

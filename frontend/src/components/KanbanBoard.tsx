import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Milestone, Users, Filter, X, Flame } from 'lucide-react';
import type { Project, Stage, Task, TaskStatus, ProjectCollaborator } from '../types';
import { TASK_STATUS_LABELS, getTaskTags } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { StageColumn } from './StageColumn';
import { DashboardOverview } from './DashboardOverview';
import { AvatarStack } from './collaborators/AvatarStack';

export interface KanbanBoardProps {
  project?: Project | null;
  stages: Stage[];
  tasks: Task[];
  summaryTasks?: Task[];
  collaborators?: ProjectCollaborator[];
  onOpenCollaboratorsModal?: () => void;
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onMoveTaskToStage?: (taskId: string, targetStageId: string) => Promise<void>;
  onUpdateTaskTags?: (taskId: string, tags: string[]) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onDeleteStage?: (stageId: string, stageTitle: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onOpenCreateTask: (stageId?: string) => void;
  onOpenCreateStage?: () => void;
  onOpenCreateModal?: () => void;
  selectedCategory?: string;
  searchQuery?: string;
  onTaskUpdated?: (updatedTask: Task) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  tasks,
  summaryTasks = tasks,
  collaborators = [],
  onOpenCollaboratorsModal,
  onMoveTask,
  onMoveTaskToStage,
  onUpdateTaskTags,
  onDeleteTask,
  onDeleteStage,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenCreateTask,
  onOpenCreateStage,
  onOpenCreateModal,
  searchQuery = '',
  onTaskUpdated,
}) => {
  const [boardView, setBoardView] = useState<'STAGES' | 'STATUS'>(stages.length === 0 ? 'STAGES' : 'STATUS');
  const [selectedStageId, setSelectedStageId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'ALL'>('ALL');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [onlyFocus, setOnlyFocus] = useState<boolean>(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);

  useEffect(() => {
    if (stages.length === 0) setBoardView('STAGES');
  }, [stages.length]);

  useEffect(() => {
    if (selectedStageId !== 'ALL' && !stages.some((s) => s.id === selectedStageId)) {
      setSelectedStageId('ALL');
    }
  }, [stages, selectedStageId]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    summaryTasks.forEach((t) => {
      getTaskTags(t).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [summaryTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedStageId !== 'ALL' && t.stageId !== selectedStageId) return false;
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
      if (selectedAssigneeId === 'UNASSIGNED' && t.assigneeId) return false;
      if (selectedAssigneeId !== 'ALL' && selectedAssigneeId !== 'UNASSIGNED' && t.assigneeId !== selectedAssigneeId) {
        return false;
      }
      if (onlyFocus && !t.isSprintActive) return false;
      if (selectedTag !== 'ALL' && !getTaskTags(t).includes(selectedTag)) return false;
      return true;
    });
  }, [tasks, selectedStageId, selectedStatus, selectedAssigneeId, onlyFocus, selectedTag]);

  const visibleStages = useMemo(() => {
    if (selectedStageId === 'ALL') return stages;
    return stages.filter((s) => s.id === selectedStageId);
  }, [stages, selectedStageId]);

  const activeFiltersCount =
    (selectedStageId !== 'ALL' ? 1 : 0) +
    (selectedStatus !== 'ALL' ? 1 : 0) +
    (selectedAssigneeId !== 'ALL' ? 1 : 0) +
    (selectedTag !== 'ALL' ? 1 : 0) +
    (onlyFocus ? 1 : 0);

  const clearFilters = () => {
    setSelectedStageId('ALL');
    setSelectedStatus('ALL');
    setSelectedAssigneeId('ALL');
    setSelectedTag('ALL');
    setOnlyFocus(false);
  };

  const todoTasks = filteredTasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = filteredTasks.filter((t) => t.status === 'DONE');

  const handleCreateTaskTrigger = (stageId?: string) => {
    if (onOpenCreateTask) {
      onOpenCreateTask(stageId);
    } else if (onOpenCreateModal) {
      onOpenCreateModal();
    }
  };

  return (
    <div className="flex flex-col gap-8 bb-page-enter motion-reduce:animate-none">
      {/* Dashboard Overview Metrics Section */}
      {searchQuery.trim() && <p className="-mb-6 break-words text-sm text-slate-600 dark:text-slate-300 [overflow-wrap:anywhere]">A busca filtra somente os cartões do quadro; os indicadores abaixo consideram todas as tarefas do projeto.</p>}
      <DashboardOverview tasks={summaryTasks} compactMobile />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Quadro de tarefas</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Visualize o fluxo por status ou por etapa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div aria-label="Agrupar tarefas" className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            <button type="button" onClick={() => setBoardView('STATUS')} disabled={stages.length === 0} aria-pressed={boardView === 'STATUS'} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${boardView === 'STATUS' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}>Por status</button>
            <button type="button" onClick={() => setBoardView('STAGES')} aria-pressed={boardView === 'STAGES'} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${boardView === 'STAGES' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}>Por etapa</button>
          </div>
          {stages.length > 0 && (
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
              aria-expanded={isFiltersOpen}
              aria-label="Filtros de tarefas"
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
                isFiltersOpen || activeFiltersCount > 0
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="bb-tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white dark:bg-indigo-500">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}
          {onOpenCollaboratorsModal && (
            <button
              type="button"
              onClick={onOpenCollaboratorsModal}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {collaborators && collaborators.length > 0 ? (
                <AvatarStack collaborators={collaborators} max={3} size="sm" />
              ) : (
                <Users className="h-4 w-4 text-slate-500" />
              )}
              <span className="hidden sm:inline">Equipe</span>
            </button>
          )}
          {onOpenCreateStage && (
            <button
              type="button"
              onClick={onOpenCreateStage}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              <span>Nova etapa</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleCreateTaskTrigger()}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Plus className="h-4 w-4" />
            <span>Nova tarefa</span>
          </button>
        </div>
      </div>

      {/* Minimalist Filter Bar */}
      {stages.length > 0 && isFiltersOpen && (
        <div className="-mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filtros:</span>
            </span>

            {/* Stage Selector */}
            <select
              aria-label="Filtrar por etapa"
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Todas as etapas ({tasks.length})</option>
              {stages.map((stage) => {
                const count = tasks.filter((t) => t.stageId === stage.id).length;
                return (
                  <option key={stage.id} value={stage.id}>
                    {stage.title} ({count})
                  </option>
                );
              })}
            </select>

            {/* Status Selector */}
            <select
              aria-label="Filtrar por status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TaskStatus | 'ALL')}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Todos os status</option>
              <option value="TODO">{TASK_STATUS_LABELS.TODO}</option>
              <option value="IN_PROGRESS">{TASK_STATUS_LABELS.IN_PROGRESS}</option>
              <option value="DONE">{TASK_STATUS_LABELS.DONE}</option>
            </select>

            {/* Assignee Selector */}
            <select
              aria-label="Filtrar por responsável"
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Todos os responsáveis</option>
              <option value="UNASSIGNED">Sem responsável</option>
              {collaborators.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Focus Toggle */}
            <button
              type="button"
              onClick={() => setOnlyFocus(!onlyFocus)}
              className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
                onlyFocus
                  ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Flame className={`h-3.5 w-3.5 ${onlyFocus ? 'fill-amber-500 text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
              <span>Em Foco</span>
            </button>

            {/* Tag Selector */}
            {availableTags.length > 0 && (
              <select
                aria-label="Filtrar por etiqueta"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Todas as etiquetas</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="bb-tabular font-mono text-[11px]">
              <strong>{filteredTasks.length}</strong> de {tasks.length}
            </span>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                title="Limpar todos os filtros"
                className="inline-flex h-7 items-center gap-1 rounded-md bg-rose-50 px-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60"
              >
                <X className="h-3 w-3" />
                <span>Limpar ({activeFiltersCount})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Board Columns View */}
      {filteredTasks.length === 0 && (searchQuery.trim() || activeFiltersCount > 0) ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Nenhuma tarefa encontrada</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Nenhuma tarefa corresponde aos filtros ou termo de busca selecionados.
          </p>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      ) : boardView === 'STAGES' ? (
        stages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto mb-3.5">
              <Milestone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Nenhuma etapa cadastrada neste projeto
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Crie uma etapa para começar a organizar as tarefas deste projeto.
            </p>
            {onOpenCreateStage && (
              <button
                type="button"
                onClick={onOpenCreateStage}
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Criar Primeira Etapa</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-nowrap items-start gap-5 overflow-x-auto pb-4 snap-x">
            {visibleStages.map((stage) => {
              const stageTasks = filteredTasks.filter((t) => t.stageId === stage.id);
              return (
                <div key={stage.id} className="w-[330px] sm:w-[360px] shrink-0 snap-start">
                  <StageColumn
                    stage={stage}
                    stages={stages}
                    tasks={stageTasks}
                    collaborators={collaborators}
                    onMoveTask={onMoveTask}
                    onMoveTaskToStage={onMoveTaskToStage}
                    onUpdateTaskTags={onUpdateTaskTags}
                    onDeleteTask={onDeleteTask}
                    onDeleteStage={onDeleteStage}
                    onAddSubtask={onAddSubtask}
                    onToggleSubtask={onToggleSubtask}
                    onDeleteSubtask={onDeleteSubtask}
                    onOpenCreateTaskForStage={handleCreateTaskTrigger}
                    onTaskUpdated={onTaskUpdated}
                  />
                </div>
              );
            })}

            {/* Quick Add Stage Column Card */}
            {onOpenCreateStage && (
              <button
                type="button"
                onClick={onOpenCreateStage}
                className="group flex w-[330px] sm:w-[360px] shrink-0 snap-start self-start flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 min-h-[280px]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors group-hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-slate-100">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    Adicionar Nova Etapa
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400">
                    Clique para criar mais um marco no projeto
                  </p>
                </div>
              </button>
            )}
          </div>
        )
      ) : (
        /* 3-Column Traditional Status Grid (TODO, IN_PROGRESS, DONE) */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <KanbanColumn
            status="TODO"
            tasks={todoTasks}
            stages={stages}
            collaborators={collaborators}
            onMoveTask={onMoveTask}
            onMoveTaskToStage={onMoveTaskToStage}
            onUpdateTaskTags={onUpdateTaskTags}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onTaskUpdated={onTaskUpdated}
          />

          <KanbanColumn
            status="IN_PROGRESS"
            tasks={inProgressTasks}
            stages={stages}
            collaborators={collaborators}
            onMoveTask={onMoveTask}
            onMoveTaskToStage={onMoveTaskToStage}
            onUpdateTaskTags={onUpdateTaskTags}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onTaskUpdated={onTaskUpdated}
          />

          <KanbanColumn
            status="DONE"
            tasks={doneTasks}
            stages={stages}
            collaborators={collaborators}
            onMoveTask={onMoveTask}
            onMoveTaskToStage={onMoveTaskToStage}
            onUpdateTaskTags={onUpdateTaskTags}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onTaskUpdated={onTaskUpdated}
          />
        </div>
      )}

    </div>
  );
};

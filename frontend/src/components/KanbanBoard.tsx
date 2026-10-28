import React, { useEffect, useState } from 'react';
import { Plus, Milestone, Users } from 'lucide-react';
import type { Project, Stage, Task, TaskStatus, ProjectCollaborator } from '../types';
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
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  tasks,
  summaryTasks = tasks,
  collaborators = [],
  onOpenCollaboratorsModal,
  onMoveTask,
  onDeleteTask,
  onDeleteStage,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenCreateTask,
  onOpenCreateStage,
  onOpenCreateModal,
  searchQuery = '',
}) => {
  const [boardView, setBoardView] = useState<'STAGES' | 'STATUS'>(stages.length === 0 ? 'STAGES' : 'STATUS');
  useEffect(() => {
    if (stages.length === 0) setBoardView('STAGES');
  }, [stages.length]);
  const todoTasks = tasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((t) => t.status === 'DONE');

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

      {/* Board Columns View */}
      {tasks.length === 0 && searchQuery.trim() ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-6 py-16 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Nenhuma tarefa encontrada</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Tente outro termo na busca.</p>
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
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {stages.map((stage) => {
              const stageTasks = tasks.filter((t) => t.stageId === stage.id);
              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  tasks={stageTasks}
                  collaborators={collaborators}
                  onMoveTask={onMoveTask}
                  onDeleteTask={onDeleteTask}
                  onDeleteStage={onDeleteStage}
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                  onOpenCreateTaskForStage={handleCreateTaskTrigger}
                />
              );
            })}

            {/* Quick Add Stage Column Card */}
            {onOpenCreateStage && (
              <button
                type="button"
                onClick={onOpenCreateStage}
                className="group flex w-full self-start flex-row items-center justify-start gap-3 rounded-xl border border-dashed border-slate-300 bg-white/50 px-4 py-3 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 sm:flex-col sm:justify-center sm:gap-0 sm:p-6 sm:text-center"
              >
                <div className="mb-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors group-hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-slate-100 sm:mb-2 sm:h-10 sm:w-10">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">
                    Adicionar Nova Etapa
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-400 sm:mt-1">
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
            collaborators={collaborators}
            onMoveTask={onMoveTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />

          <KanbanColumn
            status="IN_PROGRESS"
            tasks={inProgressTasks}
            collaborators={collaborators}
            onMoveTask={onMoveTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />

          <KanbanColumn
            status="DONE"
            tasks={doneTasks}
            collaborators={collaborators}
            onMoveTask={onMoveTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />
        </div>
      )}

    </div>
  );
};

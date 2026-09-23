import React, { useState } from 'react';
import { Plus, Milestone, Layers } from 'lucide-react';
import type { Project, Stage, Task, TaskStatus } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { StageColumn } from './StageColumn';
import { DashboardOverview } from './DashboardOverview';

export interface KanbanBoardProps {
  project?: Project | null;
  stages: Stage[];
  tasks: Task[];
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onOpenCreateTask: (stageId?: string) => void;
  onOpenCreateStage?: () => void;
  onOpenCreateModal?: () => void;
  selectedCategory?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  project,
  stages,
  tasks,
  onMoveTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenCreateTask,
  onOpenCreateStage,
  onOpenCreateModal,
}) => {
  const [boardView, setBoardView] = useState<'STAGES' | 'STATUS'>('STATUS');
  const [filterMode, setFilterMode] = useState<'ALL' | 'SPRINT'>('ALL');

  const displayedTasks = filterMode === 'SPRINT' ? tasks.filter(t => t.isSprintActive) : tasks;

  const todoTasks = displayedTasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = displayedTasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = displayedTasks.filter((t) => t.status === 'DONE');

  const handleCreateTaskTrigger = (stageId?: string) => {
    if (onOpenCreateTask) {
      onOpenCreateTask(stageId);
    } else if (onOpenCreateModal) {
      onOpenCreateModal();
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      {/* Dashboard Overview Metrics Section */}
      <DashboardOverview tasks={tasks} />

      {/* Modern Professional Board Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-4 flex-wrap">
          
          {/* Scope Filter: All vs Sprint */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-lg border border-slate-200/60 shadow-inner">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterMode === 'ALL'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Backlog do Projeto</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('SPRINT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                filterMode === 'SPRINT'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Milestone className="w-3.5 h-3.5" />
              <span>Sprint Semanal</span>
              {filterMode !== 'SPRINT' && tasks.filter(t => t.isSprintActive).length > 0 && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>
          </div>

          <div className="w-px h-5 bg-slate-200 hidden sm:block" />

          {/* Grouping Toggle */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="hidden sm:inline">Agrupar por:</span>
            <select
              value={boardView}
              onChange={(e) => setBoardView(e.target.value as 'STAGES' | 'STATUS')}
              className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
            >
              <option value="STATUS">Status (Kanban)</option>
              <option value="STAGES">Etapas ({stages.length})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenCreateStage && (
            <button
              type="button"
              onClick={onOpenCreateStage}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Etapa</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleCreateTaskTrigger()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Board Columns View */}
      {boardView === 'STAGES' ? (
        stages.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-card">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3.5">
              <Milestone className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhuma etapa cadastrada neste projeto
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Crie etapas (milestones) para organizar o fluxo de trabalho e atribuir tarefas a cada fase.
            </p>
            {onOpenCreateStage && (
              <button
                type="button"
                onClick={onOpenCreateStage}
                className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Criar Primeira Etapa</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {stages.map((stage) => {
              const stageTasks = displayedTasks.filter((t) => t.stageId === stage.id);
              return (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  tasks={stageTasks}
                  onMoveTask={onMoveTask}
                  onDeleteTask={onDeleteTask}
                  onAddSubtask={onAddSubtask}
                  onToggleSubtask={onToggleSubtask}
                  onDeleteSubtask={onDeleteSubtask}
                  onOpenCreateTaskForStage={handleCreateTaskTrigger}
                />
              );
            })}

            {/* Quick Add Stage Column Card */}
            {onOpenCreateStage && (
              <div
                onClick={onOpenCreateStage}
                className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl bg-slate-50/50 hover:bg-indigo-50/30 p-6 text-center cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover:border-indigo-300 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-colors mb-2">
                  <Plus className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">
                  Adicionar Nova Etapa
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Clique para criar mais um marco no projeto
                </p>
              </div>
            )}
          </div>
        )
      ) : (
        /* 3-Column Traditional Status Grid (TODO, IN_PROGRESS, DONE) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <KanbanColumn
            status="TODO"
            tasks={todoTasks}
            onMoveTask={onMoveTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />

          <KanbanColumn
            status="IN_PROGRESS"
            tasks={inProgressTasks}
            onMoveTask={onMoveTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />

          <KanbanColumn
            status="DONE"
            tasks={doneTasks}
            onMoveTask={onMoveTask}
            onDeleteTask={onDeleteTask}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />
        </div>
      )}

      {/* When total tasks is 0 */}
      {tasks.length === 0 && (
        <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-card mt-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Nenhuma tarefa cadastrada no momento
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {project
              ? `Adicione tarefas às etapas do projeto "${project.title}".`
              : 'Comece organizando sua rotina criando sua primeira tarefa.'}
          </p>
          <button
            onClick={() => handleCreateTaskTrigger()}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Criar Primeira Tarefa</span>
          </button>
        </div>
      )}
    </div>
  );
};

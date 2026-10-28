import React, { useState } from 'react';
import { Layers, Plus, Milestone, Trash2 } from 'lucide-react';
import type { Stage, Task, TaskStatus, ProjectCollaborator } from '../types';
import { STAGE_STATUS_LABELS, STAGE_STATUS_COLORS } from '../types';
import { TaskCard } from './TaskCard';

export interface StageColumnProps {
  stage: Stage;
  stages?: Stage[];
  tasks: Task[];
  collaborators?: ProjectCollaborator[];
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onMoveTaskToStage?: (taskId: string, targetStageId: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onDeleteStage?: (stageId: string, stageTitle: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onOpenCreateTaskForStage: (stageId: string) => void;
}

export const StageColumn: React.FC<StageColumnProps> = ({
  stage,
  stages,
  tasks,
  collaborators,
  onMoveTask,
  onMoveTaskToStage,
  onDeleteTask,
  onDeleteStage,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenCreateTaskForStage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onMoveTaskToStage) {
      await onMoveTaskToStage(taskId, stage.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => void handleDrop(e)}
      className={`bb-kanban-column group/stage flex min-h-[280px] min-w-0 flex-col transition-all ${
        isDragOver
          ? 'ring-2 ring-indigo-500/70 bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className="bb-kanban-column-header flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <Milestone className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <h3 className="truncate text-sm font-bold text-slate-800 dark:text-slate-200" title={stage.title}>
            {stage.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              STAGE_STATUS_COLORS[stage.status] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {STAGE_STATUS_LABELS[stage.status]}
          </span>
          <span className="bb-tabular font-mono px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100/80 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/70">
            {tasks.length}
          </span>
          {onDeleteStage && (
            <button
              type="button"
              onClick={() => onDeleteStage(stage.id, stage.title)}
              title={`Excluir etapa "${stage.title}"`}
              aria-label={`Excluir etapa ${stage.title}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-500 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Cards List / Container */}
      <div className="flex-1 space-y-3 p-3 sm:p-4">
        {tasks.length === 0 ? (
          <div className="h-44 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-400 p-4 text-center">
            <Layers className="w-7 h-7 mb-2 opacity-40 text-slate-400 dark:text-slate-400" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nenhuma tarefa nesta etapa</p>
            <button
              type="button"
              onClick={() => onOpenCreateTaskForStage(stage.id)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar tarefa</span>
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              stageName={stage.title}
              stages={stages}
              collaborators={collaborators}
              onMoveTask={onMoveTask}
              onMoveTaskToStage={onMoveTaskToStage}
              onDeleteTask={onDeleteTask}
              onAddSubtask={onAddSubtask}
              onToggleSubtask={onToggleSubtask}
              onDeleteSubtask={onDeleteSubtask}
            />
          ))
        )}
      </div>

      {/* Footer Add Task Button */}
      <div className="p-3 bg-white/50 dark:bg-slate-900/50 border-t border-slate-200/60 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => onOpenCreateTaskForStage(stage.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-dashed border-indigo-200 dark:border-indigo-800/70 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Adicionar Tarefa</span>
        </button>
      </div>
    </div>
  );
};

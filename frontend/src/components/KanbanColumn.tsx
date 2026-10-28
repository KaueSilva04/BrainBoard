import React, { useState } from 'react';
import { Clock, PlayCircle, CheckCircle2, Layers } from 'lucide-react';
import type { Task, TaskStatus, Stage, ProjectCollaborator } from '../types';
import { TASK_STATUS_LABELS } from '../types';
import { TaskCard } from './TaskCard';

export interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  stages?: Stage[];
  collaborators?: ProjectCollaborator[];
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onMoveTaskToStage?: (taskId: string, targetStageId: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onOpenCreateTask?: () => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  stages,
  collaborators,
  onMoveTask,
  onMoveTaskToStage,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
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
    if (taskId) {
      await onMoveTask(taskId, status);
    }
  };
  const columnConfig: Record<
    TaskStatus,
    {
      icon: React.ReactNode;
      badgeStyle: string;
      emptyText: string;
    }
  > = {
    TODO: {
      icon: <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      badgeStyle: 'bg-amber-100/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/70',
      emptyText: 'Nenhuma tarefa pendente',
    },
    IN_PROGRESS: {
      icon: <PlayCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
      badgeStyle: 'bg-indigo-100/80 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/70',
      emptyText: 'Nenhuma tarefa em andamento',
    },
    DONE: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
      badgeStyle: 'bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/70',
      emptyText: 'Nenhuma tarefa concluída',
    },
  };

  const config = columnConfig[status];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => void handleDrop(e)}
      className={`bb-kanban-column flex min-h-[280px] min-w-0 flex-col transition-all ${
        isDragOver
          ? 'ring-2 ring-indigo-500/70 bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-500'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className="bb-kanban-column-header flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          {config.icon}
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {TASK_STATUS_LABELS[status]}
          </h3>
        </div>
        <span
          className={`bb-tabular font-mono px-2.5 py-0.5 rounded-full text-xs font-bold ${config.badgeStyle}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards List / Container */}
      <div className="flex-1 space-y-3 p-3 sm:p-4">
        {tasks.length === 0 ? (
          <div className="h-44 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-400 p-4 text-center">
            <Layers className="w-7 h-7 mb-2 opacity-40 text-slate-400 dark:text-slate-400" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{config.emptyText}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
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
    </div>
  );
};

import React from 'react';
import { Layers, Plus, Milestone } from 'lucide-react';
import type { Stage, Task, TaskStatus } from '../types';
import { STAGE_STATUS_LABELS, STAGE_STATUS_COLORS } from '../types';
import { TaskCard } from './TaskCard';

export interface StageColumnProps {
  stage: Stage;
  tasks: Task[];
  onMoveTask: (id: string, status: TaskStatus) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onOpenCreateTaskForStage: (stageId: string) => void;
}

export const StageColumn: React.FC<StageColumnProps> = ({
  stage,
  tasks,
  onMoveTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenCreateTaskForStage,
}) => {
  return (
    <div className="flex flex-col bg-slate-100/75 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden min-h-[550px] border-t-4 border-t-indigo-500">
      {/* Column Header */}
      <div className="px-4 py-3.5 bg-white/70 border-b border-slate-200/80 flex items-center justify-between backdrop-blur-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Milestone className="w-4 h-4 text-indigo-500 shrink-0" />
          <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase truncate" title={stage.title}>
            {stage.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              STAGE_STATUS_COLORS[stage.status] || 'bg-slate-100 text-slate-600'
            }`}
          >
            {STAGE_STATUS_LABELS[stage.status]}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100/80 text-indigo-800 border border-indigo-200/60">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Cards List / Container */}
      <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="h-44 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <Layers className="w-7 h-7 mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Nenhuma tarefa nesta etapa</p>
            <button
              type="button"
              onClick={() => onOpenCreateTaskForStage(stage.id)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
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
              onMoveTask={onMoveTask}
              onDeleteTask={onDeleteTask}
              onAddSubtask={onAddSubtask}
              onToggleSubtask={onToggleSubtask}
              onDeleteSubtask={onDeleteSubtask}
            />
          ))
        )}
      </div>

      {/* Footer Add Task Button */}
      <div className="p-3 bg-white/50 border-t border-slate-200/60">
        <button
          type="button"
          onClick={() => onOpenCreateTaskForStage(stage.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-dashed border-indigo-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Adicionar Tarefa</span>
        </button>
      </div>
    </div>
  );
};

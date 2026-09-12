import React from 'react';
import { Clock, PlayCircle, CheckCircle2, Layers } from 'lucide-react';
import { Task, Status, STATUS_LABELS } from '../types/task';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  status: Status;
  tasks: Task[];
  onMoveTask: (id: string, status: Status) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onMoveTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}) => {
  const columnConfig: Record<
    Status,
    {
      icon: React.ReactNode;
      accentBorder: string;
      badgeStyle: string;
      emptyText: string;
    }
  > = {
    TODO: {
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      accentBorder: 'border-t-4 border-t-amber-400',
      badgeStyle: 'bg-amber-100/80 text-amber-800 border border-amber-200/60',
      emptyText: 'Nenhuma tarefa pendente',
    },
    IN_PROGRESS: {
      icon: <PlayCircle className="w-4 h-4 text-indigo-500" />,
      accentBorder: 'border-t-4 border-t-indigo-500',
      badgeStyle: 'bg-indigo-100/80 text-indigo-800 border border-indigo-200/60',
      emptyText: 'Nenhuma tarefa em andamento',
    },
    DONE: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      accentBorder: 'border-t-4 border-t-emerald-500',
      badgeStyle: 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/60',
      emptyText: 'Nenhuma tarefa concluída',
    },
  };

  const config = columnConfig[status];

  return (
    <div
      className={`flex flex-col bg-slate-100/75 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden min-h-[550px] ${config.accentBorder}`}
    >
      {/* Column Header */}
      <div className="px-4 py-3.5 bg-white/70 border-b border-slate-200/80 flex items-center justify-between backdrop-blur-xs">
        <div className="flex items-center gap-2">
          {config.icon}
          <h3 className="text-xs font-extrabold text-slate-800 tracking-wider uppercase">
            {STATUS_LABELS[status]}
          </h3>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${config.badgeStyle}`}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards List / Container */}
      <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="h-44 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <Layers className="w-7 h-7 mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">{config.emptyText}</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onMoveTask={onMoveTask}
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

import React from 'react';
import { Task, Status, CategoryFilter } from '../types/task';
import { KanbanColumn } from './KanbanColumn';
import { DashboardOverview } from './DashboardOverview';
import { Layers, Plus } from 'lucide-react';

interface KanbanBoardProps {
  tasks: Task[];
  selectedCategory: CategoryFilter;
  onMoveTask: (id: string, status: Status) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddSubtask: (taskId: string, title: string) => Promise<void>;
  onToggleSubtask: (id: string, isDone: boolean) => Promise<void>;
  onDeleteSubtask?: (id: string) => Promise<void>;
  onOpenCreateModal: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  selectedCategory,
  onMoveTask,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenCreateModal,
}) => {
  // Apply category filter
  const filteredTasks = tasks.filter((task) => {
    if (selectedCategory === 'ALL') return true;
    return task.category === selectedCategory;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = filteredTasks.filter((t) => t.status === 'DONE');

  return (
    <div className="space-y-6">
      {/* Dashboard Overview Metrics Section (R2) */}
      <DashboardOverview tasks={tasks} />

      {/* 3-Column Kanban Grid (TODO, IN_PROGRESS, DONE) */}
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

      {/* When total tasks is 0 */}
      {filteredTasks.length === 0 && tasks.length === 0 && (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3.5">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma tarefa cadastrada ainda
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Comece organizando sua rotina criando sua primeira tarefa no FocusTask.
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Criar Primeira Tarefa</span>
          </button>
        </div>
      )}
    </div>
  );
};

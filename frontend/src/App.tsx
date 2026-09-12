import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './services/api';
import { Task, Status, CategoryFilter, CreateTaskInput, Category } from './types/task';
import { Navbar } from './components/Navbar';
import { KanbanBoard } from './components/KanbanBoard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TopHeader } from './components/TopHeader';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Fetch all tasks from backend
  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getTasks();
      setTasks(data);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(
        'Não foi possível conectar ao servidor backend. Verifique se o serviço está ativo.'
      );
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      ALL: tasks.length,
      PROJECT: 0,
      COLLEGE: 0,
      PERSONAL: 0,
    };
    for (const t of tasks) {
      if (t.category in counts) {
        counts[t.category as Category]++;
      }
    }
    return counts;
  }, [tasks]);

  // Filter tasks by search query
  const displayedTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase().trim();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  // Create task handler
  const handleCreateTask = async (input: CreateTaskInput) => {
    const newTask = await api.createTask(input);
    // Ensure subtasks array exists
    const completeTask: Task = {
      ...newTask,
      subtasks: newTask.subtasks || [],
    };
    setTasks((prev) => [completeTask, ...prev]);
  };

  // Move task handler
  const handleMoveTask = async (id: string, newStatus: Status) => {
    // Optimistic update
    const prevTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    try {
      const updated = await api.moveTask(id, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
      );
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert on failure
      setTasks(prevTasks);
      alert('Erro ao mover a tarefa. As alterações foram revertidas.');
    }
  };

  // Delete task handler
  const handleDeleteTask = async (id: string) => {
    const prevTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await api.deleteTask(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setTasks(prevTasks);
      alert('Erro ao excluir tarefa.');
    }
  };

  // Add subtask handler
  const handleAddSubtask = async (taskId: string, title: string) => {
    const newSubtask = await api.addSubtask(taskId, title);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: [...(t.subtasks || []), newSubtask] }
          : t
      )
    );
  };

  // Toggle subtask handler
  const handleToggleSubtask = async (id: string, isDone: boolean) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: (t.subtasks || []).map((st) =>
          st.id === id ? { ...st, isDone } : st
        ),
      }))
    );

    try {
      const updated = await api.toggleSubtask(id, isDone);
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          subtasks: (t.subtasks || []).map((st) =>
            st.id === id ? { ...st, ...updated } : st
          ),
        }))
      );
    } catch (err) {
      console.error('Failed to toggle subtask:', err);
      // Revert
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          subtasks: (t.subtasks || []).map((st) =>
            st.id === id ? { ...st, isDone: !isDone } : st
          ),
        }))
      );
    }
  };

  // Delete subtask handler
  const handleDeleteSubtask = async (id: string) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: (t.subtasks || []).filter((st) => st.id !== id),
      }))
    );

    try {
      await api.deleteSubtask(id);
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      loadTasks();
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-slate-800 flex flex-col md:flex-row">
      {/* Lateral Sidebar Navigation */}
      <Navbar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categoryCounts={categoryCounts}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        isConnected={isConnected}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Modern Top Header */}
        <TopHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          isConnected={isConnected}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Error Banner if connection fails */}
          {error && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm shadow-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadTasks}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
            </div>
          )}

          {/* Loading Spinner */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-28 space-y-3">
              <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Carregando quadro Kanban...</p>
            </div>
          ) : (
            <KanbanBoard
              tasks={displayedTasks}
              selectedCategory={selectedCategory}
              onMoveTask={handleMoveTask}
              onDeleteTask={handleDeleteTask}
              onAddSubtask={handleAddSubtask}
              onToggleSubtask={handleToggleSubtask}
              onDeleteSubtask={handleDeleteSubtask}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="py-4 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white/50">
          FocusTask • Kanban Pessoal & MCP • Produtividade Focada
        </footer>
      </div>

      {/* Task Creation Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateTask={handleCreateTask}
        defaultCategory={selectedCategory === 'ALL' ? 'PROJECT' : selectedCategory}
      />
    </div>
  );
};

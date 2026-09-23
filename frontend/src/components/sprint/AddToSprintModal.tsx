import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Flame, Check, Loader2, Layers, AlertCircle } from 'lucide-react';
import { tasksApi } from '../../services/api';
import type { Task } from '../../types';
import { TASK_STATUS_LABELS } from '../../types';

export interface AddToSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskAdded: () => void;
}

export const AddToSprintModal: React.FC<AddToSprintModalProps> = ({
  isOpen,
  onClose,
  onTaskAdded,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addingTaskId, setAddingTaskId] = useState<string | null>(null);
  const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setSearchQuery('');
    setAddedTaskIds(new Set());

    tasksApi
      .listAll()
      .then((allTasks) => {
        // Filter out tasks already in the sprint
        const backlogTasks = allTasks.filter((t) => !t.isSprintActive);
        setTasks(backlogTasks);
      })
      .catch((err: any) => {
        console.error('Failed to load backlog tasks:', err);
        setError('Não foi possível carregar as tarefas do backlog.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const handleAddToSprint = async (taskId: string) => {
    if (addingTaskId) return;
    setAddingTaskId(taskId);
    try {
      await tasksApi.toggleSprint(taskId, true);
      setAddedTaskIds((prev) => new Set(prev).add(taskId));
      onTaskAdded();
    } catch (err: any) {
      console.error('Failed to add task to sprint:', err);
      alert('Erro ao adicionar tarefa à sprint.');
    } finally {
      setAddingTaskId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Adicionar à Sprint Semanal
              </h2>
              <p className="text-[11px] text-slate-400">
                Selecione tarefas do backlog dos projetos para focar nesta semana
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefa ou etapa do backlog..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Carregando backlog...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-14 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Nenhuma tarefa disponível</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {searchQuery
                  ? 'Nenhuma tarefa corresponde à sua pesquisa.'
                  : 'Todas as tarefas existentes já estão na Sprint ou não há tarefas criadas.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isAdded = addedTaskIds.has(task.id);
              const isCurrentAdding = addingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-amber-300 hover:shadow-xs transition-all"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {task.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-600">
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </div>
                    {task.stage?.title && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{task.stage.title}</span>
                      </div>
                    )}
                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleAddToSprint(task.id)}
                    disabled={isAdded || isCurrentAdding}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isAdded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                    }`}
                  >
                    {isCurrentAdding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Adicionado</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};

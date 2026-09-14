import React from 'react';
import { Search, Bell, Plus, ChevronDown, Sparkles, FolderKanban } from 'lucide-react';
import type { Project, ProjectSummary } from '../types';

export interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  onOpenCreateProjectModal?: () => void;
  isConnected?: boolean;
  activeProject?: Project | ProjectSummary | null;
  onBackToProjects?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onOpenCreateProjectModal,
  isConnected = true,
  activeProject = null,
  onBackToProjects,
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 px-6 lg:px-8 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Page Title & Breadcrumb */}
        <div>
          <div className="flex items-center gap-2">
            {activeProject ? (
              <div className="flex items-center gap-2 flex-wrap">
                {onBackToProjects && (
                  <button
                    type="button"
                    onClick={onBackToProjects}
                    className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Projetos</span>
                  </button>
                )}
                {onBackToProjects && <span className="text-slate-300">/</span>}
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 truncate max-w-md">
                  <span className="truncate">{activeProject.title}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                    <Sparkles className="w-3 h-3" />
                    Ativo
                  </span>
                </h1>
              </div>
            ) : (
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Dashboard de Projetos</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Sparkles className="w-3 h-3" />
                  v2.0
                </span>
              </h1>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {activeProject
              ? activeProject.description || 'Quadro de tarefas e marcos do projeto'
              : 'Gerencie seus projetos, etapas e tarefas em um só lugar'}
          </p>
        </div>

        {/* Middle & Right Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-end">
          {/* Search Pill Input */}
          <div className="relative flex-1 sm:w-64 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar tarefas..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/90 border border-transparent focus:border-indigo-300 focus:bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Connection Status Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="font-medium text-[11px]">
              {isConnected ? 'Conectado' : 'Offline'}
            </span>
          </div>

          {/* Notification Bell */}
          <button
            type="button"
            aria-label="Notificações"
            className="relative w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Quick Create Action Buttons */}
          {onOpenCreateProjectModal && !activeProject && (
            <button
              onClick={onOpenCreateProjectModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Projeto</span>
            </button>
          )}

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Nova Tarefa</span>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200/80">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              KA
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-tight">Kaue</p>
              <p className="text-[10px] text-slate-400 leading-tight">Admin</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden xl:block" />
          </div>
        </div>
      </div>
    </header>
  );
};

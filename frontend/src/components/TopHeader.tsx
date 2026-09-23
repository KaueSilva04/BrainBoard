import React from 'react';
import {
  Search,
  Plus,
  Sparkles,
  FolderKanban,
  RefreshCw,
  LayoutGrid,
  Flame,
  Calendar,
} from 'lucide-react';
import type { Project, ProjectSummary, ActiveView } from '../types';

export interface TopHeaderProps {
  currentView?: ActiveView;
  onSelectView?: (view: ActiveView) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  onOpenCreateProjectModal?: () => void;
  onOpenCreateAppointmentModal?: () => void;
  onOpenCreateDeadlineModal?: () => void;
  isConnected?: boolean;
  isSyncing?: boolean;
  onRefresh?: () => void;
  activeProject?: Project | ProjectSummary | null;
  onBackToProjects?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentView = 'PROJECTS',
  onSelectView,
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onOpenCreateProjectModal,
  onOpenCreateAppointmentModal,
  onOpenCreateDeadlineModal,
  isConnected = true,
  isSyncing = false,
  onRefresh,
  activeProject = null,
  onBackToProjects,
}) => {
  // Navigation tabs definition
  const viewTabs: { id: ActiveView; label: string; icon: React.ReactNode }[] = [
    { id: 'PROJECTS', label: 'Projetos', icon: <FolderKanban className="w-3.5 h-3.5" /> },
    { 
      id: 'BOARD', 
      label: activeProject?.type === 'ACADEMIC' ? 'Plano de Ensino' : 'Quadro Kanban', 
      icon: <LayoutGrid className="w-3.5 h-3.5" /> 
    },
    { id: 'SPRINT', label: 'Visão Global', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'CALENDAR', label: 'Calendário', icon: <Calendar className="w-3.5 h-3.5" /> },
  ];

  // Contextual title and subtitle
  let viewTitle = 'Dashboard de Projetos';
  let viewSubtitle = 'Gerencie seus projetos, etapas e tarefas em um só lugar';

  if (currentView === 'BOARD') {
    viewTitle = activeProject ? activeProject.title : 'Painel de Projeto';
    viewSubtitle = activeProject?.description || 'Acompanhe as tarefas e progresso';
  } else if (currentView === 'SPRINT') {
    viewTitle = 'Visão Global';
    viewSubtitle = 'Foco da semana: todas as suas tarefas ativas';
  } else if (currentView === 'ACADEMIC') {
    viewTitle = 'Área Acadêmica';
    viewSubtitle = 'Disciplinas, prazos de entrega e datas de avaliações';
  } else if (currentView === 'CALENDAR') {
    viewTitle = 'Calendário & Compromissos';
    viewSubtitle = 'Agenda de compromissos e datas limites das tarefas';
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 px-6 lg:px-8 py-3.5">
      <div className="flex flex-col gap-3">
        {/* Upper Row: Breadcrumbs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Page Title & Breadcrumb */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {currentView === 'BOARD' && onBackToProjects && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                  <button
                    type="button"
                    onClick={onBackToProjects}
                    className="hover:text-indigo-600 transition-colors flex items-center gap-1"
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Projetos</span>
                  </button>
                  <span>/</span>
                </div>
              )}
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 truncate max-w-md">
                <span className="truncate">{viewTitle}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                  <Sparkles className="w-3 h-3" />
                  v2.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {viewSubtitle}
            </p>
          </div>

          {/* Middle & Right Controls */}
          <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-end">
            {/* Search Pill Input */}
            <div className="relative flex-1 sm:w-60 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar no BrainBoard..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100/90 border border-transparent focus:border-indigo-300 focus:bg-white rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            {/* Connection & Live Sync Indicator */}
            <button
              type="button"
              onClick={onRefresh}
              title={isConnected ? 'Sincronizado em tempo real (clique para atualizar)' : 'Servidor desconectado'}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-600 transition-all cursor-pointer group"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className="font-medium text-[11px]">
                {isConnected ? 'Tempo Real' : 'Offline'}
              </span>
              <RefreshCw
                className={`w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-transform ${
                  isSyncing ? 'animate-spin text-indigo-600' : ''
                }`}
              />
            </button>

            {/* Quick Contextual Actions */}
            {currentView === 'CALENDAR' && onOpenCreateAppointmentModal ? (
              <button
                onClick={onOpenCreateAppointmentModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Compromisso</span>
              </button>
            ) : currentView === 'ACADEMIC' && onOpenCreateDeadlineModal ? (
              <button
                onClick={onOpenCreateDeadlineModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-purple-500/20 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Nova Entrega</span>
              </button>
            ) : onOpenCreateProjectModal && currentView === 'PROJECTS' ? (
              <button
                onClick={onOpenCreateProjectModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo Projeto</span>
              </button>
            ) : (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-500/20 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Nova Tarefa</span>
              </button>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200/80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                KA
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">Kaue</p>
                <p className="text-[10px] text-slate-400 leading-tight">Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Row: Modern Pill Tab Switcher */}
        {onSelectView && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            {viewTabs.map((tab) => {
              const isActive = currentView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectView(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};

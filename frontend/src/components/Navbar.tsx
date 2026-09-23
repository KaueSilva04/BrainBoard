import React, { useState } from 'react';
import {
  Brain,
  Plus,
  FolderKanban,
  GraduationCap,
  Calendar,
  Sparkles,
  Menu,
  X,
  Layers,
  ChevronRight,
  Flame,
  LayoutGrid,
} from 'lucide-react';
import type { ProjectSummary, ActiveView } from '../types';

export interface NavbarProps {
  currentView?: ActiveView;
  onSelectView?: (view: ActiveView) => void;
  projects?: ProjectSummary[];
  activeProjectId?: string | null;
  onSelectProject?: (id: string | null) => void;
  onOpenCreateProjectModal?: () => void;
  onOpenCreateModal: () => void;
  isConnected?: boolean;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  sprintActiveCount?: number;
  academicCount?: number;
  calendarCount?: number;
  categoryCounts?: {
    ALL?: number;
    PROJECT?: number;
    COLLEGE?: number;
    PERSONAL?: number;
    [key: string]: number | undefined;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView = 'BOARD',
  onSelectView,
  projects = [],
  activeProjectId = null,
  onSelectProject,
  onOpenCreateProjectModal,
  onOpenCreateModal,
  isConnected = true,
  sprintActiveCount = 0,
  academicCount = 0,
  calendarCount = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-5 space-y-6">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-1 py-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-slate-900">
                BrainBoard
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium -mt-0.5">
              Projetos, Sprint & MCP
            </p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="mt-8 space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Navegação Principal
          </p>

          {/* 1. Portfolio View Button */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('PROJECTS');
              if (onSelectProject) onSelectProject(null);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
              currentView === 'PROJECTS' && !activeProjectId
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FolderKanban className="w-4 h-4 text-indigo-600" />
              <span>Meus Projetos</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100/80 text-indigo-700">
              {projects.length}
            </span>
          </button>

          {/* 2. Kanban Board View Button */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('BOARD');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
              currentView === 'BOARD'
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              <span>Quadro Kanban</span>
            </div>
            {activeProjectId && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>

          {/* 3. Visão Global View Button */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('SPRINT');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
              currentView === 'SPRINT'
                ? 'bg-amber-50 text-amber-700 font-semibold border border-amber-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Visão Global</span>
            </div>
            {sprintActiveCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                {sprintActiveCount}
              </span>
            )}
          </button>

          {/* 4. Área Acadêmica View Button */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('ACADEMIC');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
              currentView === 'ACADEMIC'
                ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              <span>Área Acadêmica</span>
            </div>
            {academicCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                {academicCount}
              </span>
            )}
          </button>

          {/* 5. Calendário View Button */}
          <button
            onClick={() => {
              if (onSelectView) onSelectView('CALENDAR');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors ${
              currentView === 'CALENDAR'
                ? 'bg-indigo-50 text-indigo-600 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Calendário</span>
            </div>
            {calendarCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">
                {calendarCount}
              </span>
            )}
          </button>
        </div>

        {/* Project Switcher List */}
        {projects.length > 0 && (
          <div className="mt-6 space-y-1">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Projetos Ativos
              </p>
              {onOpenCreateProjectModal && (
                <button
                  type="button"
                  onClick={onOpenCreateProjectModal}
                  aria-label="Criar novo projeto"
                  className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {projects.map((p) => {
                const isActive = activeProjectId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (onSelectProject) onSelectProject(p.id);
                      if (onSelectView) onSelectView('BOARD');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                      isActive
                        ? 'bg-indigo-100/70 text-indigo-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Layers className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{p.title}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Workspaces / Category Filters Removed for cleaner UI */}
      </div>

      {/* Bottom Card: Status & Action Button */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-100/70 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Assistente MCP</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="font-medium">
              {isConnected ? 'MCP SSE Online' : 'Servidor Offline'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {onOpenCreateProjectModal && (
            <button
              onClick={() => {
                onOpenCreateProjectModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200/80 transition-all transform active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Novo Projeto</span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenCreateModal();
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all transform active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nova Tarefa</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Lateral Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200/80 shadow-sidebar shrink-0 h-screen sticky top-0 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Top Header Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Brain className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base text-slate-900">BrainBoard</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCreateModal}
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full shadow-2xl overflow-y-auto">
            {sidebarContent}
          </div>
          <div
            className="flex-1"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}
    </>
  );
};

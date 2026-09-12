import React, { useState } from 'react';
import {
  Brain,
  Plus,
  FolderKanban,
  GraduationCap,
  UserCheck,
  LayoutGrid,
  Calendar,
  BarChart2,
  Settings,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import { CategoryFilter } from '../types/task';

export interface NavbarProps {
  selectedCategory: CategoryFilter;
  onSelectCategory: (category: CategoryFilter) => void;
  categoryCounts: {
    ALL: number;
    PROJECT: number;
    COLLEGE: number;
    PERSONAL: number;
  };
  onOpenCreateModal: () => void;
  isConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  onOpenCreateModal,
  isConnected = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categoryFilters: {
    id: CategoryFilter;
    label: string;
    icon: React.ReactNode;
    color: string;
    activeBg: string;
  }[] = [
    {
      id: 'ALL',
      label: 'Todas',
      icon: <LayoutGrid className="w-4 h-4" />,
      color: 'text-slate-600',
      activeBg: 'bg-indigo-50 text-indigo-600 font-semibold',
    },
    {
      id: 'PROJECT',
      label: 'Projetos',
      icon: <FolderKanban className="w-4 h-4 text-amber-500" />,
      color: 'text-slate-600',
      activeBg: 'bg-amber-50 text-amber-700 font-semibold border border-amber-200/60',
    },
    {
      id: 'COLLEGE',
      label: 'Faculdade',
      icon: <GraduationCap className="w-4 h-4 text-purple-500" />,
      color: 'text-slate-600',
      activeBg: 'bg-purple-50 text-purple-700 font-semibold border border-purple-200/60',
    },
    {
      id: 'PERSONAL',
      label: 'Pessoais',
      icon: <UserCheck className="w-4 h-4 text-emerald-500" />,
      color: 'text-slate-600',
      activeBg: 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60',
    },
  ];

  const staticNavLinks = [
    { label: 'Calendário', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Estatísticas', icon: <BarChart2 className="w-4 h-4" /> },
    { label: 'Configurações', icon: <Settings className="w-4 h-4" /> },
  ];

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
                FocusTask
              </span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                MCP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium -mt-0.5">
              Gestão Inteligente
            </p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="mt-8 space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Menu Principal
          </p>
          <button
            onClick={() => {
              onSelectCategory('ALL');
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-semibold text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              <span>Dashboard</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100/80 text-indigo-700">
              {categoryCounts.ALL}
            </span>
          </button>

          {staticNavLinks.map((link) => (
            <div
              key={link.label}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-medium cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {link.icon}
                <span>{link.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Category Filters */}
        <div className="mt-8 space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Categorias
          </p>
          {categoryFilters.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id as keyof typeof categoryCounts] ?? 0;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? cat.activeBg
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {cat.icon}
                  <span>{cat.label}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
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
          <span className="font-extrabold text-base text-slate-900">FocusTask</span>
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

import React from 'react';
import { Search, Plus, FolderKanban, RefreshCw, X, Moon, Sun, ArrowLeft, Users, KeyRound } from 'lucide-react';
import type { Project, ProjectSummary, ActiveView, ProjectCollaborator } from '../types';
import type { Theme } from '../hooks/useTheme';
import { AvatarStack } from './collaborators/AvatarStack';
import { McpTokenModal } from './McpTokenModal';

export interface TopHeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
  currentView?: ActiveView;
  onSelectView?: (view: ActiveView) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  onOpenCreateProjectModal?: () => void;
  onOpenCreateDeadlineModal?: () => void;
  isConnected?: boolean;
  isSyncing?: boolean;
  onRefresh?: () => void;
  activeProject?: Project | ProjectSummary | null;
  onBackToProjects?: () => void;
  projects?: ProjectSummary[];
  onSelectProject?: (id: string | null) => void;
  collaborators?: ProjectCollaborator[];
  onOpenCollaboratorsModal?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  theme,
  onToggleTheme,
  currentView = 'OVERVIEW',
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onOpenCreateProjectModal,
  onOpenCreateDeadlineModal,
  isConnected = true,
  isSyncing = false,
  onRefresh,
  activeProject = null,
  onBackToProjects,
  collaborators = [],
  onOpenCollaboratorsModal,
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [isMcpModalOpen, setIsMcpModalOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.getModifierState('AltGraph')) return;
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k' &&
        (currentView === 'PROJECTS' || currentView === 'BOARD')
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  const page = {
    OVERVIEW: {
      title: 'Visão geral',
      subtitle: 'Acompanhe seu foco ativo, projetos em andamento e próximos compromissos.',
    },
    PROJECTS: {
      title: 'Projetos',
      subtitle: 'Organize seu trabalho e acompanhe o progresso de cada frente.',
    },
    BOARD: {
      title: activeProject?.title || 'Quadro Kanban',
      subtitle: activeProject?.description || 'Gerencie etapas, tarefas e subtarefas deste projeto.',
    },
    PROJECT_SPRINT: {
      title: 'Foco do projeto',
      subtitle: activeProject?.title || 'Tarefas selecionadas para atenção imediata neste projeto.',
    },
    SPRINT: {
      title: 'Foco global',
      subtitle: 'Tarefas marcadas para foco em todos os projetos.',
    },
    ACADEMIC: {
      title: 'Área acadêmica',
      subtitle: 'Disciplinas, leituras, provas e entregas organizadas por matéria.',
    },
    CALENDAR: {
      title: 'Calendário',
      subtitle: 'Visão mensal unificada de compromissos, tarefas e entregas.',
    },
  }[currentView];

  const showSearch = currentView === 'PROJECTS' || currentView === 'BOARD';
  const isProjectContext = currentView === 'BOARD' || currentView === 'PROJECT_SPRINT';

  const action =
    currentView === 'PROJECTS' && onOpenCreateProjectModal
      ? { label: 'Novo projeto', click: onOpenCreateProjectModal }
      : currentView === 'OVERVIEW' && onOpenCreateProjectModal
      ? { label: 'Novo projeto', click: onOpenCreateProjectModal }
      : currentView === 'ACADEMIC' && onOpenCreateDeadlineModal
      ? { label: 'Nova entrega', click: onOpenCreateDeadlineModal }
      : currentView === 'BOARD' && activeProject && 'stages' in activeProject && activeProject.stages.length > 0
      ? { label: 'Nova tarefa', click: onOpenCreateModal }
      : null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3.5 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0f1526]/95 sm:px-7 lg:px-9">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            {isProjectContext && onBackToProjects && (
              <button
                type="button"
                onClick={onBackToProjects}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <FolderKanban className="h-3.5 w-3.5" />
                <span>Projetos</span>
              </button>
            )}
            <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              {page.title}
            </h1>
          </div>
          <p className="mt-1 line-clamp-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
            {page.subtitle}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
          {showSearch && (
            <div className="relative min-w-[180px] flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label={currentView === 'PROJECTS' ? 'Buscar projetos' : 'Buscar tarefas'}
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={currentView === 'PROJECTS' ? 'Buscar projetos... (Ctrl+K)' : 'Buscar tarefas... (Ctrl+K)'}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-slate-300 dark:focus:bg-slate-900 dark:focus:ring-white/10 sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Atualizar dados do workspace"
            title={isConnected ? 'Dados do workspace atualizados' : 'Falha ao atualizar dados; tentar novamente'}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="hidden md:inline">{isConnected ? 'Sincronizado' : 'Falha na leitura'}</span>
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {isProjectContext && onOpenCollaboratorsModal && (
            <button
              type="button"
              onClick={onOpenCollaboratorsModal}
              title="Gerenciar equipe do projeto"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {collaborators && collaborators.length > 0 ? (
                <AvatarStack collaborators={collaborators} max={3} size="sm" />
              ) : (
                <Users className="h-4 w-4 text-slate-500" />
              )}
              <span className="hidden sm:inline">Equipe</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMcpModalOpen(true)}
            aria-label="Token e Conexão MCP"
            title="Token e Conexão MCP (Codex / IA)"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <KeyRound className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
            <span className="hidden sm:inline">Token MCP</span>
          </button>

          {action && (
            <button
              type="button"
              onClick={action.click}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>{action.label}</span>
            </button>
          )}
        </div>
      </div>
      <McpTokenModal isOpen={isMcpModalOpen} onClose={() => setIsMcpModalOpen(false)} />
    </header>
  );
};

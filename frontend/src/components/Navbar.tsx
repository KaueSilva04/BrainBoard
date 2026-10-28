import React, { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Plus,
  FolderKanban,
  GraduationCap,
  Calendar,
  Menu,
  X,
  ChevronRight,
  Flame,
  LayoutGrid,
  Milestone,
  Gauge,
  LogOut,
  KeyRound,
  Check,
  Copy,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import type { ProjectSummary, ActiveView } from '../types';
import { getProjectCover } from '../utils/projectCover';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export interface NavbarProps {
  currentView?: ActiveView;
  onSelectView?: (view: ActiveView) => void;
  projects?: ProjectSummary[];
  activeProjectId?: string | null;
  onSelectProject?: (id: string | null) => void;
  onOpenCreateProjectModal?: () => void;
  onOpenCreateModal: () => void;
  isConnected?: boolean;
  projectsLoadError?: boolean;
  sprintActiveCount?: number;
  calendarCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView = 'OVERVIEW',
  onSelectView,
  projects = [],
  activeProjectId = null,
  onSelectProject,
  onOpenCreateProjectModal,
  isConnected = true,
  projectsLoadError = false,
  sprintActiveCount = 0,
  calendarCount = 0,
}) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [mcpToken, setMcpToken] = useState<string>('');
  const [mcpExpiresIn, setMcpExpiresIn] = useState<string>('365d');
  const [loadingMcpToken, setLoadingMcpToken] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const openMcpModal = async () => {
    setIsMcpModalOpen(true);
    setLoadingMcpToken(true);
    try {
      const res = await authApi.mcpToken();
      setMcpToken(res.token);
      setMcpExpiresIn(res.expiresIn || '365d');
    } catch {
      const stored = localStorage.getItem('brainboard_auth_token') || '';
      setMcpToken(stored);
    } finally {
      setLoadingMcpToken(false);
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const drawer = drawerRef.current;
    const focusable = () =>
      drawer?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    focusable()?.[0]?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        return;
      }
      if (event.key === 'Tab') {
        const items = focusable();
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !drawer?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !drawer?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
      document.body.style.overflow = previousOverflow;
      menuButtonRef.current?.focus();
    };
  }, [isMobileMenuOpen]);

  const selectView = (view: ActiveView) => {
    if (view === 'PROJECTS') onSelectProject?.(null);
    onSelectView?.(view);
    setIsMobileMenuOpen(false);
  };

  const navItems: { id: ActiveView; label: string; icon: typeof Gauge; count?: number }[] = [
    { id: 'OVERVIEW', label: 'Visão geral', icon: Gauge },
    { id: 'PROJECTS', label: 'Projetos', icon: FolderKanban, count: projects.length },
    { id: 'SPRINT', label: 'Foco global', icon: Flame, count: sprintActiveCount },
    { id: 'ACADEMIC', label: 'Área acadêmica', icon: GraduationCap },
    { id: 'CALENDAR', label: 'Calendário', icon: Calendar, count: calendarCount },
  ];

  const statusDotColor = (status?: string) =>
    status === 'ACTIVE'
      ? 'bg-cyan-400'
      : status === 'COMPLETED'
      ? 'bg-emerald-400'
      : 'bg-amber-400';

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-[#1b1947] text-indigo-100 dark:bg-[#090d16] dark:text-slate-200">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white border border-white/15">
          <Brain className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-base font-extrabold tracking-tight text-white">
            BrainBoard
          </span>
          <span className="block truncate text-xs text-indigo-200/80 dark:text-slate-400">
            Painel de progresso
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <nav aria-label="Navegação principal" className="space-y-1">
          {navItems.map(({ id, label, icon: Icon, count }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectView(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                  active
                    ? 'bg-white/15 text-white ring-1 ring-white/20 dark:bg-slate-800 dark:ring-slate-700'
                    : 'text-indigo-100/80 hover:bg-white/10 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-indigo-300 dark:text-slate-400'}`} />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`bb-tabular rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-indigo-100 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <section aria-label="Atalhos de projetos" className="border-t border-white/10 pt-5">
          <div className="mb-2.5 flex items-center justify-between px-3">
            <h2 className="text-xs font-semibold text-slate-300 dark:text-slate-200">
              Carteira de projetos
            </h2>
            {onOpenCreateProjectModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenCreateProjectModal();
                  setIsMobileMenuOpen(false);
                }}
                aria-label="Criar projeto"
                title="Criar projeto"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            {projects.length === 0 ? (
              <p className="rounded-xl bg-white/5 px-3 py-3 text-xs leading-relaxed text-indigo-200/80 dark:text-slate-400">
                {projectsLoadError
                  ? 'Não foi possível atualizar a lista de projetos.'
                  : 'Seus projetos aparecerão aqui.'}
              </p>
            ) : (
              projects.map((project) => {
                const isSelected = activeProjectId === project.id;
                const isProjectRoute = isSelected && (currentView === 'BOARD' || currentView === 'PROJECT_SPRINT');
                return (
                  <div key={project.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject?.(project.id);
                        setIsMobileMenuOpen(false);
                      }}
                      aria-current={isProjectRoute ? 'page' : undefined}
                      aria-label={`Abrir projeto ${project.title}`}
                      title={project.title}
                      className={`group flex min-h-11 w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                        isSelected
                          ? 'bg-white/15 text-white ring-1 ring-white/20 dark:bg-slate-800/90 dark:ring-slate-700'
                          : 'text-indigo-100/85 hover:bg-white/10 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                        <img
                          src={getProjectCover(project.id)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover opacity-90"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                        <span
                          aria-hidden="true"
                          className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ring-1 ring-slate-950 ${statusDotColor(project.status)}`}
                        />
                      </div>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                        {project.title}
                      </span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                          isSelected ? 'text-indigo-300' : 'text-indigo-300/50 group-hover:translate-x-0.5'
                        }`}
                      />
                    </button>

                    {isSelected && (
                      <div className="ml-5 flex flex-col gap-0.5 border-l border-white/15 pl-3">
                        <button
                          type="button"
                          onClick={() => selectView('BOARD')}
                          aria-current={currentView === 'BOARD' ? 'page' : undefined}
                          className={`flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                            currentView === 'BOARD'
                              ? 'bg-indigo-500/30 text-white'
                              : 'text-indigo-200/75 hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                          <span>Quadro Kanban</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => selectView('PROJECT_SPRINT')}
                          aria-current={currentView === 'PROJECT_SPRINT' ? 'page' : undefined}
                          className={`flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${
                            currentView === 'PROJECT_SPRINT'
                              ? 'bg-amber-500/25 text-amber-200'
                              : 'text-indigo-200/75 hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:text-slate-200'
                          }`}
                        >
                          <Milestone className="h-3.5 w-3.5 shrink-0" />
                          <span>Foco do projeto</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {user && (
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: user.avatarColor || '#334155' }}
            >
              {(user.name || user.email || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.name || 'Usuário'}</p>
              <p className="truncate text-[11px] text-indigo-200/70 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={openMcpModal}
              title="Token e Conexão MCP (365 dias)"
              aria-label="Token e Conexão MCP"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-indigo-200/80 hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={logout}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-indigo-200/80 hover:bg-white/10 hover:text-white dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div
        aria-label={isConnected ? 'Dados do workspace atualizados' : 'Falha ao atualizar dados do workspace'}
        className="flex items-center gap-2.5 border-t border-white/10 px-5 py-4 text-xs text-indigo-200/80 dark:text-slate-400"
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}
        />
        <span className="truncate">
          {isConnected ? 'Dados do workspace atualizados' : 'Falha ao atualizar dados do workspace'}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden h-dvh w-64 shrink-0 border-r border-indigo-950/20 dark:border-slate-800/80 lg:block">
        {sidebarContent}
      </aside>

      <div className="flex h-14 shrink-0 items-center justify-between border-b border-indigo-950/20 bg-[#1b1947] px-4 text-white dark:border-slate-800 dark:bg-[#090d16] lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white border border-white/15">
            <Brain className="h-4 w-4" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">BrainBoard</span>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation-dialog"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-indigo-100 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            ref={drawerRef}
            id="mobile-navigation-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Navegação principal"
            tabIndex={-1}
            className="relative h-full w-72 max-w-[85vw] outline-none"
          >
            {sidebarContent}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex-1 bg-slate-950/55"
          />
        </div>
      )}

      {isMcpModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="bb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setIsMcpModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="mcp-token-modal-title"
              className="bb-modal-panel w-full max-w-lg rounded-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <h2 id="mcp-token-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Conexão MCP do Usuário
                  </h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Token vinculado a <strong>{user?.email}</strong> com validade de <strong>{mcpExpiresIn}</strong> (acessa apenas projetos onde você é proprietário ou colaborador).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMcpModalOpen(false)}
                  aria-label="Fechar modal MCP"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      URL Streamable HTTP (Codex / Antigravity / Cursor)
                    </span>
                    <button
                      type="button"
                      disabled={!mcpToken || loadingMcpToken}
                      onClick={() => copyText(`${window.location.origin}/mcp?token=${mcpToken}`, 'url')}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-slate-900 px-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      {copiedField === 'url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'url' ? 'Copiado' : 'Copiar URL'}
                    </button>
                  </div>
                  <code className="block break-all rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                    {loadingMcpToken ? 'Gerando token de longa duração...' : `${window.location.origin}/mcp?token=${mcpToken}`}
                  </code>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Token Bearer (Validade: {mcpExpiresIn})
                    </span>
                    <button
                      type="button"
                      disabled={!mcpToken || loadingMcpToken}
                      onClick={() => copyText(mcpToken, 'token')}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      {copiedField === 'token' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'token' ? 'Copiado' : 'Copiar Token'}
                    </button>
                  </div>
                  <code className="block max-h-24 overflow-y-auto break-all rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {loadingMcpToken ? 'Carregando...' : mcpToken}
                  </code>
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMcpModalOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

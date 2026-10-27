import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  FolderKanban,
  Play,
  RefreshCw,
} from 'lucide-react';
import { dashboardApi } from '../services/api';
import type { ActiveView, DashboardOverviewDto, ProjectStatus, TaskStatus } from '../types';
import { PROJECT_STATUS_LABELS, TASK_STATUS_LABELS } from '../types';
import { getProjectCover } from '../utils/projectCover';

interface DashboardOverviewPageProps {
  onSelectView: (view: ActiveView) => void;
  onSelectProject: (id: string) => void;
}

const PROJECT_STATUS_META: Record<ProjectStatus, { dotClass: string; badgeClass: string }> = {
  ACTIVE: {
    dotClass: 'bg-emerald-500',
    badgeClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  PLANNING: {
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  COMPLETED: {
    dotClass: 'bg-slate-500',
    badgeClass: 'border-slate-500/25 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  },
};

const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  IN_PROGRESS: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  TODO: 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  DONE: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

function buildOverviewWindow(): { from: string; to: string } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function parseCalendarDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  return new Date(value);
}

function formatShortDayMonth(value?: string | null): { day: string; month: string } | null {
  if (!value) return null;
  const parsed = parseCalendarDate(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
    .toUpperCase();
  return { day, month };
}

function formatEventHour(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /T00:00:00(?:\.000)?Z$/.test(value)) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  onSelectView,
  onSelectProject,
}) => {
  const [data, setData] = useState<DashboardOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = buildOverviewWindow();
      const result = await dashboardApi.getOverview(from, to);
      setData(result);
    } catch {
      setError('Não foi possível sincronizar o resumo operacional agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const counts = data?.projectCounts ?? { total: 0, planning: 0, active: 0, completed: 0 };
  const focusTasks = data?.focusTasks ?? [];
  const projects = data?.projects ?? [];
  const upcomingEvents = data?.upcomingEvents ?? [];

  const inProgressCount = focusTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const todoCount = focusTasks.filter((t) => t.status === 'TODO').length;
  const activeExecutionRatio =
    focusTasks.length > 0 ? Math.round((inProgressCount / focusTasks.length) * 100) : 0;

  const primaryFocusTask =
    focusTasks.find((t) => t.status === 'IN_PROGRESS') ?? focusTasks[0] ?? null;
  const featuredProject =
    (primaryFocusTask
      ? projects.find((p) => p.id === primaryFocusTask.project.id)
      : null) ??
    projects.find((p) => p.status === 'ACTIVE') ??
    projects[0] ??
    null;

  const radialRadius = 38;
  const radialCircumference = 2 * Math.PI * radialRadius;
  const radialDashOffset =
    radialCircumference - (activeExecutionRatio / 100) * radialCircumference;

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="bb-panel flex flex-wrap items-center justify-between gap-4 border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-800 dark:text-rose-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-rose-500/25"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.72fr)_minmax(20rem,0.88fr)]">
        {/* Main Central Column */}
        <div className="space-y-6">
          {/* Top Focus & Radial Telemetry Panel */}
          <section className="bb-panel overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(15.5rem,0.85fr)]">
              {/* Left: Clean Architectural Priority Callout */}
              <div className="flex flex-col justify-between p-6 sm:p-7">
                <div className="space-y-3">
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                    {primaryFocusTask
                      ? primaryFocusTask.title
                      : featuredProject
                      ? featuredProject.title
                      : 'Organize seu ciclo de entregas'}
                  </h2>

                  <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {primaryFocusTask
                      ? `${primaryFocusTask.project.title} · ${primaryFocusTask.stage.title}`
                      : featuredProject
                      ? `Quadro Kanban · ${featuredProject.title}`
                      : 'Selecione tarefas nos seus projetos para acompanhar a execução aqui.'}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {primaryFocusTask ? (
                    <button
                      type="button"
                      onClick={() => onSelectProject(primaryFocusTask.project.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Continuar em {primaryFocusTask.project.title}</span>
                    </button>
                  ) : featuredProject ? (
                    <button
                      type="button"
                      onClick={() => onSelectProject(featuredProject.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span>Abrir {featuredProject.title}</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onSelectView('SPRINT')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                  >
                    <span>Quadro de Foco</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Tração do foco */}
              <div className="flex flex-col justify-between border-t border-[var(--bb-border)] bg-[var(--bb-surface-2)]/55 p-6 lg:border-l lg:border-t-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Tração do Foco
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Tarefas ativas em andamento
                    </p>
                  </div>

                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                    <svg
                      className="h-24 w-24 -rotate-90 transform"
                      viewBox="0 0 96 96"
                      aria-label={`Tração do foco: ${activeExecutionRatio}%`}
                    >
                      <circle
                        cx="48"
                        cy="48"
                        r={radialRadius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-200 dark:text-slate-800"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r={radialRadius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={radialCircumference}
                        strokeDashoffset={radialDashOffset}
                        strokeLinecap="round"
                        className="text-indigo-600 transition-all duration-500 dark:text-indigo-400"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="bb-tabular font-mono text-lg font-bold text-slate-900 dark:text-white">
                        {loading ? '--' : `${activeExecutionRatio}%`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--bb-border)] rounded-xl border border-[var(--bb-border)] bg-[var(--bb-surface)] py-2.5 text-center">
                  <div className="px-2">
                    <div className="bb-tabular font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {loading ? '-' : focusTasks.length}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      No foco
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="bb-tabular font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {loading ? '-' : inProgressCount}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Andamento
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="bb-tabular font-mono text-sm font-bold text-slate-900 dark:text-white">
                      {loading ? '-' : todoCount}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      A fazer
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tarefas em Foco */}
          <section className="bb-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--bb-border)] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Tarefas em Foco
                </h2>
                <span className="bb-tabular rounded-md border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-2 py-0.5 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {focusTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('SPRINT')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
              >
                <span>Abrir Foco</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-[var(--bb-border)]">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse bg-[var(--bb-surface-2)]/50 px-6" />
                ))}
              </div>
            ) : focusTasks.length === 0 ? (
              <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Nenhuma tarefa em foco. Marque tarefas nos projetos para acompanhá-las aqui.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectView('SPRINT')}
                  className="shrink-0 rounded-lg border border-[var(--bb-border)] bg-[var(--bb-surface-2)] px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-400 dark:text-slate-200"
                >
                  Selecionar tarefas
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--bb-border)]">
                {focusTasks.slice(0, 6).map((task, index) => {
                  const dueBadge = formatShortDayMonth(task.dueDate);
                  const badgeClass = TASK_STATUS_BADGE[task.status] ?? TASK_STATUS_BADGE.TODO;

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelectProject(task.project.id)}
                      className="group flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left transition-colors hover:bg-[var(--bb-surface-2)]/70"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="bb-tabular font-mono text-xs font-semibold text-slate-400 dark:text-slate-500 w-5 shrink-0 text-right">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            task.status === 'IN_PROGRESS'
                              ? 'bg-amber-500'
                              : task.status === 'DONE'
                              ? 'bg-emerald-500'
                              : 'bg-slate-400 dark:bg-slate-600'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-slate-700 dark:text-white dark:group-hover:text-slate-300">
                            {task.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {task.project.title} · {task.stage.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {dueBadge && (
                          <span className="bb-tabular font-mono rounded px-2 py-0.5 text-[11px] font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {dueBadge.day} {dueBadge.month}
                          </span>
                        )}
                        <span
                          className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                        >
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Carteira de Projetos (Hybrid cards with discreet illustrated covers) */}
          <section className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Carteira de Projetos
                </h2>
                <span className="bb-tabular rounded-md border border-[var(--bb-border)] bg-[var(--bb-surface)] px-2 py-0.5 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {counts.total}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSelectView('PROJECTS')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400"
              >
                <span>Ver todos os projetos</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="bb-panel h-44 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="bb-panel p-6 text-sm text-slate-600 dark:text-slate-400">
                Nenhum projeto cadastrado ainda. Crie seu primeiro projeto para organizar etapas e tarefas.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {projects.slice(0, 4).map((project) => {
                  const statusInfo =
                    PROJECT_STATUS_META[project.status] ?? PROJECT_STATUS_META.ACTIVE;
                  const coverUrl = getProjectCover(project.id);

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                      className="bb-panel bb-card-interactive group flex flex-col overflow-hidden text-left"
                    >
                      {/* Discreet 96px Cover Strip with Scrim */}
                      <div className="relative h-24 w-full overflow-hidden border-b border-[var(--bb-border)] bg-slate-900">
                        <img
                          src={coverUrl}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="bb-cover-zoom h-full w-full object-cover opacity-85"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent"
                        />
                        <div className="absolute inset-x-3.5 bottom-2.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-slate-950/75 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                            {PROJECT_STATUS_LABELS[project.status]}
                          </span>
                          <span className="rounded-md bg-slate-950/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-200">
                            Projeto
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-4">
                        <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
                          {project.title}
                        </h3>

                        <div className="mt-3 flex items-center justify-between border-t border-[var(--bb-border)] pt-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          <span>Abrir quadro Kanban</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Support Column */}
        <aside className="space-y-6">
          {/* Status dos Projetos */}
          <section className="bb-panel p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Status dos Projetos
              </h2>
              <button
                type="button"
                onClick={() => onSelectView('PROJECTS')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Explorar projetos
              </button>
            </div>

            {(() => {
              const total = counts.total || 0;
              const active = counts.active || 0;
              const planning = counts.planning || 0;
              const completed = counts.completed || 0;
              const radius = 34;
              const circum = 2 * Math.PI * radius;
              const pActive = total > 0 ? (active / total) * circum : 0;
              const pPlanning = total > 0 ? (planning / total) * circum : 0;
              const pCompleted = total > 0 ? (completed / total) * circum : 0;

              return (
                <div className="mt-4 flex items-center gap-5">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                    <svg className="h-24 w-24 -rotate-90 transform" viewBox="0 0 88 88" aria-label="Status dos projetos">
                      {/* Background track */}
                      <circle cx="44" cy="44" r={radius} fill="transparent" stroke="currentColor" strokeWidth="7" className="text-slate-100 dark:text-slate-800" />
                      {total > 0 && (
                        <>
                          {/* Active (Emerald) */}
                          <circle cx="44" cy="44" r={radius} fill="transparent" stroke="#10b981" strokeWidth="7" strokeDasharray={`${pActive} ${circum}`} strokeDashoffset={0} />
                          {/* Planning (Amber) */}
                          <circle cx="44" cy="44" r={radius} fill="transparent" stroke="#f59e0b" strokeWidth="7" strokeDasharray={`${pPlanning} ${circum}`} strokeDashoffset={-pActive} />
                          {/* Completed (Graphite/Slate) */}
                          <circle cx="44" cy="44" r={radius} fill="transparent" stroke="#64748b" strokeWidth="7" strokeDasharray={`${pCompleted} ${circum}`} strokeDashoffset={-(pActive + pPlanning)} />
                        </>
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="bb-tabular font-mono text-xl font-extrabold text-slate-900 dark:text-white">
                        {loading ? '-' : total}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Total</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Em andamento
                      </span>
                      <span className="bb-tabular font-mono font-bold text-slate-900 dark:text-white">{loading ? '-' : active}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Planejamento
                      </span>
                      <span className="bb-tabular font-mono font-bold text-slate-900 dark:text-white">{loading ? '-' : planning}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <span className="h-2 w-2 rounded-full bg-slate-500" />
                        Concluídos
                      </span>
                      <span className="bb-tabular font-mono font-bold text-slate-900 dark:text-white">{loading ? '-' : completed}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Agenda · Próximos 7 Dias */}
          <section className="bb-panel overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--bb-border)] px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Agenda · Próximos 7 Dias
              </h2>
              <button
                type="button"
                onClick={() => onSelectView('CALENDAR')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Abrir calendário
              </button>
            </div>

            {loading ? (
              <div className="divide-y divide-[var(--bb-border)]">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse bg-[var(--bb-surface-2)]/50 px-5" />
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="p-5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Nenhum evento ou entrega nos próximos 7 dias.
              </div>
            ) : (
              <div className="divide-y divide-[var(--bb-border)]">
                {upcomingEvents.slice(0, 5).map((event) => {
                  const badge = formatShortDayMonth(event.start);
                  const hour = formatEventHour(event.start);
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onSelectView('CALENDAR')}
                      className="flex w-full items-center gap-3.5 px-5 py-3 text-left transition-colors hover:bg-[var(--bb-surface-2)]/70"
                    >
                      <div className="flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-[var(--bb-border)] bg-[var(--bb-surface-2)]">
                        <span className="bb-tabular font-mono text-xs font-bold leading-none text-slate-900 dark:text-white">
                          {badge?.day || '--'}
                        </span>
                        <span className="mt-0.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                          {badge?.month || 'DATA'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                          {event.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {event.projectTitle ||
                            (event.sourceType === 'ACADEMIC_ASSIGNMENT'
                              ? 'Acadêmico'
                              : event.sourceType === 'TASK_DEADLINE'
                              ? 'Prazo de tarefa'
                              : 'Compromisso')}
                          {hour ? ` · ${hour}` : ''}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Módulos Planejados (Compact muted footer strip) */}
          <div className="bb-panel-muted flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Em avaliação:</span>
              <span className="text-slate-500 dark:text-slate-400">Produtividade · Sequência · Relógio de foco</span>
            </div>
            <span className="self-start sm:self-auto rounded bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
              Em breve
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
};

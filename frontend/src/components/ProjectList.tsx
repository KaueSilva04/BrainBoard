import React from 'react';
import { Plus, FolderKanban, RefreshCw } from 'lucide-react';
import type { ProjectSummary } from '../types';
import { ProjectCard } from './ProjectCard';

export interface ProjectListProps {
  projects: ProjectSummary[];
  onSelectProject: (id: string) => void;
  onOpenCreateProjectModal: () => void;
  searchQuery?: string;
  onDeleteProject?: (id: string, title: string) => void;
  projectsLoadError?: boolean;
  hasProjectsSnapshot?: boolean;
  onRetryProjects?: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelectProject, onOpenCreateProjectModal, searchQuery = '', onDeleteProject, projectsLoadError = false, hasProjectsSnapshot = false, onRetryProjects }) => {
  const query = searchQuery.trim().toLocaleLowerCase('pt-BR');
  const filteredProjects = projects.filter((project) =>
    !query || project.title.toLocaleLowerCase('pt-BR').includes(query) || project.description?.toLocaleLowerCase('pt-BR').includes(query)
  );

  return <section aria-labelledby="projects-heading" className="bb-page-stack bb-page-enter motion-reduce:animate-none">
    <div className="bb-panel p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="projects-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Todos os projetos
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {projectsLoadError && !hasProjectsSnapshot
              ? 'Lista de projetos indisponível'
              : query
              ? `${filteredProjects.length} resultado${filteredProjects.length === 1 ? '' : 's'} para “${searchQuery.trim()}”`
              : `${projects.length} projeto${projects.length === 1 ? '' : 's'} no seu espaço de trabalho`}
          </p>
        </div>
      </div>
    </div>

    {projectsLoadError && hasProjectsSnapshot && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-3"><p>Não foi possível atualizar os projetos. Exibindo o último resultado carregado.</p><button type="button" onClick={onRetryProjects} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:hover:bg-amber-900"><RefreshCw className="h-4 w-4" />Tentar novamente</button></div>
    </div>}

    {projectsLoadError && !hasProjectsSnapshot ? <div role="alert" className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center dark:border-rose-900 dark:bg-rose-950/40">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300"><FolderKanban className="h-7 w-7" /></div>
      <h3 className="text-lg font-bold text-rose-900 dark:text-rose-200">Não foi possível carregar os projetos</h3>
      <p className="mt-2 max-w-md text-sm text-rose-800 dark:text-rose-300">A lista não está disponível no momento. Tente novamente para consultar os projetos.</p>
      <button type="button" onClick={onRetryProjects} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-700 px-5 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"><RefreshCw className="h-4 w-4" />Tentar novamente</button>
    </div> : filteredProjects.length === 0 ? <div className="bb-panel relative flex min-h-[340px] flex-col items-center justify-center overflow-hidden border-dashed px-6 py-14 text-center">
      {!query && <img src="/assets/empty-workspace.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.12]" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
      <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"><FolderKanban className="h-7 w-7" /></div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{query ? 'Nenhum projeto encontrado' : 'Comece pelo primeiro projeto'}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">{query ? 'Tente outro termo na busca para encontrar o projeto.' : 'Crie um projeto para organizar etapas, tarefas e acompanhar o trabalho em um só lugar.'}</p>
      {!query && <button type="button" onClick={onOpenCreateProjectModal} className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"><Plus className="h-4 w-4" />Criar projeto</button>}
    </div> : <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {filteredProjects.map((project, index) => <ProjectCard key={project.id} project={project} featured={!query && index === 0 && filteredProjects.length > 2} onClick={onSelectProject} onDelete={onDeleteProject} />)}
    </div>}
  </section>;
};

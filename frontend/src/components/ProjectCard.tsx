import React from 'react';
import { ArrowUpRight, CalendarDays, FolderKanban, Github, Layers3, Trash2, Users } from 'lucide-react';
import type { ProjectSummary, ProjectStatus, ProjectCollaborator } from '../types';
import { PROJECT_STATUS_LABELS } from '../types';
import { getProjectCover } from '../utils/projectCover';
import { AvatarStack } from './collaborators/AvatarStack';

interface ProjectCardProps {
  project: ProjectSummary;
  onClick: (id: string) => void;
  onDelete?: (id: string, title: string) => void;
  featured?: boolean;
}

const statusStyles: Record<ProjectStatus, string> = {
  PLANNING: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/70',
  ACTIVE: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800/70',
  COMPLETED: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/70',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onDelete, featured = false }) => {
  const createdAt = new Date(project.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const cover = getProjectCover(project.id);
  const projectCollaborators: ProjectCollaborator[] = (project.collaborators || []).map((c) => ({
    id: c.id,
    userId: c.userId,
    name: c.user?.name || 'Membro',
    email: c.user?.email || '',
    avatarColor: c.user?.avatarColor,
    role: c.role,
    isOwner: c.role === 'OWNER',
  }));

  return <article className={`bb-panel bb-card-motion group flex min-h-[300px] flex-col overflow-hidden ${featured ? 'md:col-span-2' : ''}`}>
    <button type="button" onClick={() => onClick(project.id)} aria-label={`Abrir projeto ${project.title}`} className={`relative flex flex-col justify-between overflow-hidden p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 sm:p-6 ${featured ? 'min-h-[178px] sm:min-h-[200px]' : 'min-h-[138px]'}`}>
      <img src={cover} alt="" loading="lazy" decoding="async" className="bb-image-motion absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-indigo-950/35 to-cyan-900/45" />
      <div className="relative flex w-full items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-slate-950/35 text-white backdrop-blur"><FolderKanban className="h-5 w-5" /></div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[project.status]}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
      </div>
      <h3 className="relative mt-5 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-white">{project.title}</h3>
    </button>
    <button type="button" onClick={() => onClick(project.id)} aria-label={`Abrir quadro de ${project.title}`} className="flex-1 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 sm:p-6"><p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{project.description || 'Abra o projeto para organizar suas etapas e tarefas.'}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Abrir quadro <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" /></span>
    </button>

    <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 dark:border-slate-700 px-5 py-3 text-xs text-slate-500 dark:text-slate-400 sm:px-6">
      {project._count && <>
        <span className="inline-flex items-center gap-1.5" title="Etapas"><Layers3 className="h-3.5 w-3.5" /><span className="bb-tabular font-mono">{project._count.stages}</span> etapas</span>
        <span className="inline-flex items-center gap-1.5" title="Membros">
          {projectCollaborators.length > 0 ? (
            <AvatarStack collaborators={projectCollaborators} max={2} size="sm" />
          ) : (
            <Users className="h-3.5 w-3.5" />
          )}
          <span className="bb-tabular font-mono">{project._count.members || projectCollaborators.length}</span> membros
        </span>
      </>}
      <span className="inline-flex items-center gap-1.5" title="Data de criação"><CalendarDays className="h-3.5 w-3.5" /><span className="bb-tabular font-mono">{createdAt}</span></span>
      <div className="ml-auto flex items-center gap-1">
        {project.githubRepo && <a href={project.githubRepo} target="_blank" rel="noopener noreferrer" aria-label={`Abrir GitHub de ${project.title}`} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300"><Github className="h-4 w-4" /></a>}
        {onDelete && <button type="button" onClick={() => onDelete(project.id, project.title)} aria-label={`Excluir projeto ${project.title}`} className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </div>
  </article>;
};

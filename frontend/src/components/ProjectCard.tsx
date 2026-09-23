import React from 'react';
import { Github, Users, Layers, BookOpen, Calendar, Trash2 } from 'lucide-react';
import type { ProjectSummary, ProjectStatus } from '../types';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../types';

interface ProjectCardProps {
  project: ProjectSummary;
  onClick: (id: string) => void;
  onDelete?: (id: string, title: string) => void;
}

const STATUS_DOT: Record<ProjectStatus, string> = {
  PLANNING: 'bg-amber-400',
  ACTIVE: 'bg-blue-500',
  COMPLETED: 'bg-emerald-500',
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, onDelete }) => {
  const formattedDate = new Date(project.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="group relative w-full text-left bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200">
      {/* Clickable Area */}
      <button
        type="button"
        onClick={() => onClick(project.id)}
        className="absolute inset-0 w-full h-full rounded-2xl z-0"
        aria-label={`Abrir projeto ${project.title}`}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors cursor-pointer" onClick={() => onClick(project.id)}>
              {project.title}
            </h3>
            {project.description && (
              <p className="mt-0.5 text-sm text-slate-400 line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Actions & Status */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project.id, project.title);
                }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Excluir projeto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${PROJECT_STATUS_COLORS[project.status]}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[project.status]}`} />
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
          {project._count && (
            <>
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {project._count.stages} etapas
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {project._count.members} membros
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {project._count.updateLogs} logs
              </span>
            </>
          )}

          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="w-3.5 h-3.5" />
            {formattedDate}
          </span>

          {project.githubRepo && (
            <a
              href={project.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors relative z-20"
              aria-label="Abrir repositório no GitHub"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

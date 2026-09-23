import React from 'react';
import { Plus, FolderKanban, Sparkles } from 'lucide-react';
import type { ProjectSummary } from '../types';
import { ProjectCard } from './ProjectCard';

export interface ProjectListProps {
  projects: ProjectSummary[];
  onSelectProject: (id: string) => void;
  onOpenCreateProjectModal: () => void;
  searchQuery?: string;
  onDeleteProject?: (id: string, title: string) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onSelectProject,
  onOpenCreateProjectModal,
  searchQuery = '',
  onDeleteProject,
}) => {
  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Portfolio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Seus Projetos</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {projects.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione um projeto para visualizar e gerenciar seu quadro de etapas e tarefas
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateProjectModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Novo Projeto</span>
        </button>
      </div>

      {/* Projects Grid or Empty State */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {searchQuery ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado ainda'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? `Não foram encontrados projetos correspondentes à busca "${searchQuery}".`
              : 'Crie seu primeiro projeto para começar a organizar etapas, metas e tarefas com o BrainBoard.'}
          </p>
          <button
            type="button"
            onClick={onOpenCreateProjectModal}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/20 transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Criar Primeiro Projeto</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onSelectProject}
              onDelete={onDeleteProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

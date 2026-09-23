import React, { useState, useEffect } from 'react';
import { X, Loader2, FolderKanban, Github, FileText, CheckCircle2, Clock, Sparkles, GraduationCap, Code } from 'lucide-react';
import type { CreateProjectInput, ProjectStatus, ProjectType } from '../types';
import { PROJECT_STATUS_LABELS } from '../types';

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (input: CreateProjectInput) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('SOFTWARE');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [githubRepo, setGithubRepo] = useState('');
  const [businessLogic, setBusinessLogic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setProjectType('SOFTWARE');
      setDescription('');
      setStatus('ACTIVE');
      setGithubRepo('');
      setBusinessLogic('');
      setErrorMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage('O título do projeto é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onCreateProject({
        title: cleanTitle,
        description: description.trim() || undefined,
        status,
        type: projectType,
        githubRepo: githubRepo.trim() || undefined,
        businessLogic: businessLogic.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar projeto. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: {
    id: ProjectStatus;
    label: string;
    icon: React.ReactNode;
    activeBorder: string;
    activeBg: string;
    textColor: string;
  }[] = [
    {
      id: 'PLANNING',
      label: PROJECT_STATUS_LABELS.PLANNING,
      icon: <Clock className="w-4 h-4" />,
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/20',
      activeBg: 'bg-amber-50/80',
      textColor: 'text-amber-700',
    },
    {
      id: 'ACTIVE',
      label: PROJECT_STATUS_LABELS.ACTIVE,
      icon: <Sparkles className="w-4 h-4" />,
      activeBorder: 'border-blue-400 ring-2 ring-blue-400/20',
      activeBg: 'bg-blue-50/80',
      textColor: 'text-blue-700',
    },
    {
      id: 'COMPLETED',
      label: PROJECT_STATUS_LABELS.COMPLETED,
      icon: <CheckCircle2 className="w-4 h-4" />,
      activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/20',
      activeBg: 'bg-emerald-50/80',
      textColor: 'text-emerald-700',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Novo Projeto
              </h2>
              <p className="text-[11px] text-slate-400">
                Crie um novo projeto com etapas e controle inteligente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-1.5">
            <label htmlFor="project-title" className="block text-xs font-bold text-slate-700">
              Título do Projeto <span className="text-rose-500">*</span>
            </label>
            <input
              id="project-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Plataforma E-commerce V2..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Project Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Tipo de Projeto
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="projectType"
                  value="SOFTWARE"
                  checked={projectType === 'SOFTWARE'}
                  onChange={() => setProjectType('SOFTWARE')}
                  className="sr-only"
                />
                <div
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    projectType === 'SOFTWARE'
                      ? 'border-indigo-400 ring-2 ring-indigo-400/20 bg-indigo-50/80 text-indigo-800 shadow-xs'
                      : 'border-slate-200/80 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Code className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <div className="font-bold">Software / Produto</div>
                    <div className="text-[10px] text-slate-400 font-normal">Kanban de desenvolvimento</div>
                  </div>
                </div>
              </label>

              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="projectType"
                  value="ACADEMIC"
                  checked={projectType === 'ACADEMIC'}
                  onChange={() => setProjectType('ACADEMIC')}
                  className="sr-only"
                />
                <div
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    projectType === 'ACADEMIC'
                      ? 'border-purple-400 ring-2 ring-purple-400/20 bg-purple-50/80 text-purple-800 shadow-xs'
                      : 'border-slate-200/80 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <div className="font-bold">Acadêmico / Faculdade</div>
                    <div className="text-[10px] text-slate-400 font-normal">Entregas, provas e matérias</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Status Inicial
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {statusOptions.map((opt) => {
                const isChecked = status === opt.id;
                return (
                  <label key={opt.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="projectStatus"
                      value={opt.id}
                      checked={isChecked}
                      onChange={() => setStatus(opt.id)}
                      className="sr-only"
                    />
                    <div
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                        isChecked
                          ? `${opt.activeBorder} ${opt.activeBg} ${opt.textColor} shadow-xs`
                          : 'border-slate-200/80 bg-slate-50/70 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label htmlFor="project-desc" className="block text-xs font-bold text-slate-700">
              Descrição <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <textarea
              id="project-desc"
              name="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos e escopo do projeto..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* GitHub Repo */}
          <div className="space-y-1.5">
            <label htmlFor="project-github" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-slate-500" />
              <span>Repositório GitHub <span className="text-slate-400 font-normal">(Opcional)</span></span>
            </label>
            <input
              id="project-github"
              name="githubRepo"
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Business Logic (for AI MCP context) */}
          <div className="space-y-1.5">
            <label htmlFor="project-businessLogic" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Lógica de Negócio (Contexto MCP / IA) <span className="text-slate-400 font-normal">(Opcional)</span></span>
            </label>
            <textarea
              id="project-businessLogic"
              name="businessLogic"
              rows={3}
              value={businessLogic}
              onChange={(e) => setBusinessLogic(e.target.value)}
              placeholder="Regras de negócio, arquitetura técnica e diretrizes de IA..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none font-mono text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                <span>Criar Projeto</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

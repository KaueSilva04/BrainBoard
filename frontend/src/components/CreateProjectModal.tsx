import React, { useState, useEffect } from 'react';
import { X, Loader2, FolderKanban, Github, FileText, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { CreateProjectInput, ProjectStatus } from '../types';
import { PROJECT_STATUS_LABELS } from '../types';
import { useAccessibleModal } from '../hooks/useAccessibleModal';

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
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ACTIVE');
  const [githubRepo, setGithubRepo] = useState('');
  const [businessLogic, setBusinessLogic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dialogRef = useAccessibleModal<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('ACTIVE');
      setGithubRepo('');
      setBusinessLogic('');
      setErrorMessage('');
    }
  }, [isOpen]);

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
      activeBg: 'bg-amber-50/80 dark:bg-amber-950/50',
      textColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      id: 'ACTIVE',
      label: PROJECT_STATUS_LABELS.ACTIVE,
      icon: <Sparkles className="w-4 h-4" />,
      activeBorder: 'border-blue-400 ring-2 ring-blue-400/20',
      activeBg: 'bg-blue-50/80 dark:bg-blue-950/50',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      id: 'COMPLETED',
      label: PROJECT_STATUS_LABELS.COMPLETED,
      icon: <CheckCircle2 className="w-4 h-4" />,
      activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/20',
      activeBg: 'bg-emerald-50/80 dark:bg-emerald-950/50',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bb-modal-backdrop">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        tabIndex={-1}
        className="relative w-full max-w-lg bb-dialog-panel overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-project-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                Novo Projeto
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                Crie um novo projeto com etapas e controle inteligente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-1.5">
            <label htmlFor="project-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Título do Projeto <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              id="project-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Plataforma E-commerce V2..."
              data-modal-autofocus
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>



          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
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
                          : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
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
            <label htmlFor="project-desc" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Descrição <span className="text-slate-400 dark:text-slate-400 font-normal">(Opcional)</span>
            </label>
            <textarea
              id="project-desc"
              name="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos e escopo do projeto..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* GitHub Repo */}
          <div className="space-y-1.5">
            <label htmlFor="project-github" className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Repositório GitHub <span className="text-slate-400 dark:text-slate-400 font-normal">(Opcional)</span></span>
            </label>
            <input
              id="project-github"
              name="githubRepo"
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Business Logic (for AI MCP context) */}
          <div className="space-y-1.5">
            <label htmlFor="project-businessLogic" className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Lógica de Negócio (Contexto MCP / IA) <span className="text-slate-400 dark:text-slate-400 font-normal">(Opcional)</span></span>
            </label>
            <textarea
              id="project-businessLogic"
              name="businessLogic"
              rows={3}
              value={businessLogic}
              onChange={(e) => setBusinessLogic(e.target.value)}
              placeholder="Regras de negócio, arquitetura técnica e diretrizes de IA..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none font-mono text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
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

import React, { useState, useEffect } from 'react';
import { X, FolderKanban, GraduationCap, UserCheck, Loader2, Sparkles } from 'lucide-react';
import { Category, CreateTaskInput } from '../types/task';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (input: CreateTaskInput) => Promise<void>;
  defaultCategory?: Category;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
  defaultCategory = 'PROJECT',
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>(defaultCategory);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync default category when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setCategory(defaultCategory);
      setErrorMessage('');
    }
  }, [isOpen, defaultCategory]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorMessage('O título da tarefa é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onCreateTask({
        title: cleanTitle,
        category,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar tarefa. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories: {
    id: Category;
    label: string;
    icon: React.ReactNode;
    activeBorder: string;
    activeBg: string;
    textColor: string;
  }[] = [
    {
      id: 'PROJECT',
      label: 'Projetos',
      icon: <FolderKanban className="w-4 h-4" />,
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/20',
      activeBg: 'bg-amber-50/80',
      textColor: 'text-amber-700',
    },
    {
      id: 'COLLEGE',
      label: 'Faculdade',
      icon: <GraduationCap className="w-4 h-4" />,
      activeBorder: 'border-purple-400 ring-2 ring-purple-400/20',
      activeBg: 'bg-purple-50/80',
      textColor: 'text-purple-700',
    },
    {
      id: 'PERSONAL',
      label: 'Pessoais',
      icon: <UserCheck className="w-4 h-4" />,
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
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Nova Tarefa
              </h2>
              <p className="text-[11px] text-slate-400">
                Preencha os campos abaixo para cadastrar no Kanban
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="block text-xs font-bold text-slate-700">
              Título da Tarefa <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Concluir relatório do projeto..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Category Selector Cards */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Categoria <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {categories.map((cat) => {
                const isChecked = category === cat.id;
                return (
                  <label key={cat.id} className="cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value={cat.id}
                      checked={isChecked}
                      onChange={() => setCategory(cat.id)}
                      className="sr-only"
                    />
                    <div
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                        isChecked
                          ? `${cat.activeBorder} ${cat.activeBg} ${cat.textColor} shadow-xs`
                          : 'border-slate-200/80 bg-slate-50/70 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="block text-xs font-bold text-slate-700">
              Descrição <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <textarea
              id="task-desc"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes, notas ou contexto para esta tarefa..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
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
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Criar Tarefa</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

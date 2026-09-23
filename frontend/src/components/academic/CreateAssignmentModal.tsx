import React, { useState, useEffect } from 'react';
import { X, Loader2, FileText } from 'lucide-react';
import type { AssignmentType } from '../../types';

export interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAssignment: (input: { title: string; type: AssignmentType; dueDate?: string }) => Promise<void>;
}

export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
  isOpen,
  onClose,
  onCreateAssignment,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AssignmentType>('HOMEWORK');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setType('HOMEWORK');
      setDueDate('');
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
      setErrorMessage('O título da atividade é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onCreateAssignment({
        title: cleanTitle,
        type,
        dueDate: dueDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar atividade. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions: { value: AssignmentType; label: string }[] = [
    { value: 'HOMEWORK', label: 'Tarefa' },
    { value: 'EXAM', label: 'Prova' },
    { value: 'PROJECT', label: 'Projeto' },
    { value: 'PRESENTATION', label: 'Apresentação' },
    { value: 'READING', label: 'Leitura' },
    { value: 'OTHER', label: 'Outro' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Nova Atividade
              </h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="assignment-title" className="block text-xs font-bold text-slate-700">
              O que você precisa fazer? <span className="text-rose-500">*</span>
            </label>
            <input
              id="assignment-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Estudar para P1, Lista de Exercícios..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assignment-type" className="block text-xs font-bold text-slate-700">
              Tipo de Atividade
            </label>
            <select
              id="assignment-type"
              value={type}
              onChange={(e) => setType(e.target.value as AssignmentType)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assignment-due" className="block text-xs font-bold text-slate-700">
              Data de Entrega <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              id="assignment-due"
              name="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
            />
          </div>

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
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                <span>Criar Atividade</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

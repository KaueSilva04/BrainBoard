import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, FileText } from 'lucide-react';
import type { AssignmentType } from '../../types';
import { useAccessibleModal } from '../../hooks/useAccessibleModal';

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
  const dialogRef = useAccessibleModal<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setType('HOMEWORK');
      setDueDate('');
      setErrorMessage('');
    }
  }, [isOpen]);

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bb-modal-backdrop">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-assignment-title"
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-md flex-col overflow-hidden bb-dialog-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-assignment-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                Nova Atividade
              </h2>
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="assignment-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              O que você precisa fazer? <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              id="assignment-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Estudar para P1, Lista de Exercícios..."
              data-modal-autofocus
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assignment-type" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tipo de Atividade
            </label>
            <select
              id="assignment-type"
              value={type}
              onChange={(e) => setType(e.target.value as AssignmentType)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="assignment-due" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Data de Entrega <span className="text-slate-400 dark:text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              id="assignment-due"
              name="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          </div>
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white border border-indigo-500/20 transition-all hover:bg-indigo-700 disabled:opacity-50"
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
    </div>,
    document.body,
  );
};

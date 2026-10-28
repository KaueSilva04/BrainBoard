import React, { useState, useEffect } from 'react';
import { X, Loader2, Milestone, Clock, PlayCircle, CheckCircle2 } from 'lucide-react';
import type { CreateStageInput, StageStatus } from '../types';
import { STAGE_STATUS_LABELS } from '../types';
import { useAccessibleModal } from '../hooks/useAccessibleModal';

export interface CreateStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  nextOrder: number;
  onCreateStage: (projectId: string, input: CreateStageInput) => Promise<void>;
}

export const CreateStageModal: React.FC<CreateStageModalProps> = ({
  isOpen,
  onClose,
  projectId,
  nextOrder,
  onCreateStage,
}) => {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<StageStatus>('PLANNING');
  const [order, setOrder] = useState<number>(nextOrder);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dialogRef = useAccessibleModal<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setStatus('PLANNING');
      setOrder(nextOrder);
      setErrorMessage('');
    }
  }, [isOpen, nextOrder]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage('O título da etapa é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onCreateStage(projectId, {
        title: cleanTitle,
        status,
        order,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar etapa. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: {
    id: StageStatus;
    label: string;
    icon: React.ReactNode;
    activeBorder: string;
    activeBg: string;
    textColor: string;
  }[] = [
    {
      id: 'PLANNING',
      label: STAGE_STATUS_LABELS.PLANNING,
      icon: <Clock className="w-4 h-4" />,
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/20',
      activeBg: 'bg-amber-50/80 dark:bg-amber-950/50',
      textColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      id: 'IN_PROGRESS',
      label: STAGE_STATUS_LABELS.IN_PROGRESS,
      icon: <PlayCircle className="w-4 h-4" />,
      activeBorder: 'border-indigo-400 ring-2 ring-indigo-400/20',
      activeBg: 'bg-indigo-50/80 dark:bg-indigo-950/50',
      textColor: 'text-indigo-700 dark:text-indigo-300',
    },
    {
      id: 'COMPLETED',
      label: STAGE_STATUS_LABELS.COMPLETED,
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
        aria-labelledby="create-stage-title"
        tabIndex={-1}
        className="relative w-full max-w-md bb-dialog-panel overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Milestone className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-stage-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight">
                Nova Etapa (Milestone)
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                Adicione uma nova etapa/coluna ao quadro do projeto
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          {/* Title Field */}
          <div className="space-y-1.5">
            <label htmlFor="stage-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Título da Etapa <span className="text-rose-500 dark:text-rose-400">*</span>
            </label>
            <input
              id="stage-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fase 1: Arquitetura e Modelagem..."
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
                      name="stageStatus"
                      value={opt.id}
                      checked={isChecked}
                      onChange={() => setStatus(opt.id)}
                      className="sr-only"
                    />
                    <div
                      className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border text-xs font-semibold transition-all ${
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

          {/* Order Field */}
          <div className="space-y-1.5">
            <label htmlFor="stage-order" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Ordem de Exibição
            </label>
            <input
              id="stage-order"
              name="order"
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
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
                <span>Criar Etapa</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

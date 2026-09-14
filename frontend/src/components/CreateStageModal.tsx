import React, { useState, useEffect } from 'react';
import { X, Loader2, Milestone, Clock, PlayCircle, CheckCircle2 } from 'lucide-react';
import type { CreateStageInput, StageStatus } from '../types';
import { STAGE_STATUS_LABELS } from '../types';

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

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setStatus('PLANNING');
      setOrder(nextOrder);
      setErrorMessage('');
    }
  }, [isOpen, nextOrder]);

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
      activeBg: 'bg-amber-50/80',
      textColor: 'text-amber-700',
    },
    {
      id: 'IN_PROGRESS',
      label: STAGE_STATUS_LABELS.IN_PROGRESS,
      icon: <PlayCircle className="w-4 h-4" />,
      activeBorder: 'border-indigo-400 ring-2 ring-indigo-400/20',
      activeBg: 'bg-indigo-50/80',
      textColor: 'text-indigo-700',
    },
    {
      id: 'COMPLETED',
      label: STAGE_STATUS_LABELS.COMPLETED,
      icon: <CheckCircle2 className="w-4 h-4" />,
      activeBorder: 'border-emerald-400 ring-2 ring-emerald-400/20',
      activeBg: 'bg-emerald-50/80',
      textColor: 'text-emerald-700',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Milestone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Nova Etapa (Milestone)
              </h2>
              <p className="text-[11px] text-slate-400">
                Adicione uma nova etapa/coluna ao quadro do projeto
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
            <label htmlFor="stage-title" className="block text-xs font-bold text-slate-700">
              Título da Etapa <span className="text-rose-500">*</span>
            </label>
            <input
              id="stage-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fase 1: Arquitetura e Modelagem..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
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

          {/* Order Field */}
          <div className="space-y-1.5">
            <label htmlFor="stage-order" className="block text-xs font-bold text-slate-700">
              Ordem de Exibição
            </label>
            <input
              id="stage-order"
              name="order"
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
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
                <span>Criar Etapa</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

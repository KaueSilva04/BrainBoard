import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Layers, CheckCircle2, Clock, PlayCircle, Calendar, Flame } from 'lucide-react';
import type { Stage, TaskStatus, CreateTaskInput } from '../types';
import { TASK_STATUS_LABELS } from '../types';

export interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  defaultStageId?: string;
  onCreateTask: (stageId: string, input: CreateTaskInput) => Promise<void>;
  defaultCategory?: string;
  defaultSprintActive?: boolean;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  stages,
  defaultStageId,
  onCreateTask,
  defaultSprintActive = false,
}) => {
  const [title, setTitle] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSprintActive, setIsSprintActive] = useState<boolean>(defaultSprintActive);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync default stage and reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setDueDate('');
      setIsSprintActive(Boolean(defaultSprintActive));
      setErrorMessage('');
      if (defaultStageId && stages.some((s) => s.id === defaultStageId)) {
        setSelectedStageId(defaultStageId);
      } else if (stages.length > 0) {
        setSelectedStageId(stages[0].id);
      } else {
        setSelectedStageId('');
      }
    }
  }, [isOpen, defaultStageId, stages, defaultSprintActive]);

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

    if (!selectedStageId) {
      setErrorMessage('Selecione uma etapa para a tarefa.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onCreateTask(selectedStageId, {
        title: cleanTitle,
        description: description.trim() || undefined,
        status,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        isSprintActive,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao criar tarefa. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: {
    id: TaskStatus;
    label: string;
    icon: React.ReactNode;
    activeBorder: string;
    activeBg: string;
    textColor: string;
  }[] = [
    {
      id: 'TODO',
      label: TASK_STATUS_LABELS.TODO,
      icon: <Clock className="w-4 h-4" />,
      activeBorder: 'border-amber-400 ring-2 ring-amber-400/20',
      activeBg: 'bg-amber-50/80',
      textColor: 'text-amber-700',
    },
    {
      id: 'IN_PROGRESS',
      label: TASK_STATUS_LABELS.IN_PROGRESS,
      icon: <PlayCircle className="w-4 h-4" />,
      activeBorder: 'border-indigo-400 ring-2 ring-indigo-400/20',
      activeBg: 'bg-indigo-50/80',
      textColor: 'text-indigo-700',
    },
    {
      id: 'DONE',
      label: TASK_STATUS_LABELS.DONE,
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
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Nova Tarefa
              </h2>
              <p className="text-[11px] text-slate-400">
                Cadastre uma tarefa vinculada a uma etapa do projeto
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
              placeholder="Ex: Implementar autenticação via token..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Stage Selector */}
          <div className="space-y-1.5">
            <label htmlFor="stage-select" className="block text-xs font-bold text-slate-700">
              Etapa (Milestone) <span className="text-rose-500">*</span>
            </label>
            {stages.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Nenhuma etapa cadastrada neste projeto. Crie uma etapa primeiro!</span>
              </div>
            ) : (
              <select
                id="stage-select"
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.title}
                  </option>
                ))}
              </select>
            )}
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
                      name="status"
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
            <label htmlFor="task-desc" className="block text-xs font-bold text-slate-700">
              Descrição <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <textarea
              id="task-desc"
              name="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes, notas ou contexto para esta tarefa..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Due Date & Sprint Active Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Due Date Field */}
            <div className="space-y-1">
              <label htmlFor="task-due" className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Prazo Limite <span className="text-slate-400 font-normal">(Opcional)</span></span>
              </label>
              <input
                id="task-due"
                name="dueDate"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* isSprintActive Checkbox */}
            <div className="space-y-1 flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isSprintActive}
                  onChange={(e) => setIsSprintActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Sprint Semanal</span>
                </div>
              </label>
            </div>
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
              disabled={isSubmitting || !title.trim() || !selectedStageId}
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

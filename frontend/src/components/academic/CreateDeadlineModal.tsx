import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Loader2, BookOpen, Layers } from 'lucide-react';
import { academicApi } from '../../services/api';
import type { AcademicSubject } from '../../types';

export interface CreateDeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: AcademicSubject[];
  defaultSubjectId?: string;
  onDeadlineCreated: () => void;
}

export const CreateDeadlineModal: React.FC<CreateDeadlineModalProps> = ({
  isOpen,
  onClose,
  subjects,
  defaultSubjectId,
  onDeadlineCreated,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Default subject selection
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setErrorMessage('');

      // Set default dueDate to tomorrow at 23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      const isoLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDueDate(isoLocal);

      if (defaultSubjectId && subjects.some((s) => s.id === defaultSubjectId)) {
        setSelectedSubjectId(defaultSubjectId);
      } else if (subjects.length > 0) {
        setSelectedSubjectId(subjects[0].id);
      } else {
        setSelectedSubjectId('');
      }
    }
  }, [isOpen, defaultSubjectId, subjects]);

  // Selected subject object
  const currentSubject = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  // Sync selected stage when subject changes
  useEffect(() => {
    if (currentSubject && currentSubject.stages && currentSubject.stages.length > 0) {
      // Prefer 'Trabalhos & Entregas' or 'Provas & Avaliações' if present
      const preferred = currentSubject.stages.find((st) =>
        st.title.toLowerCase().includes('trabalho') ||
        st.title.toLowerCase().includes('entrega') ||
        st.title.toLowerCase().includes('prova')
      );
      setSelectedStageId(preferred ? preferred.id : currentSubject.stages[0].id);
    } else {
      setSelectedStageId('');
    }
  }, [currentSubject]);

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
      setErrorMessage('O título da entrega é obrigatório.');
      return;
    }

    if (!selectedStageId) {
      setErrorMessage('Selecione a disciplina e etapa correspondente.');
      return;
    }

    if (!dueDate) {
      setErrorMessage('A data e hora limite são obrigatórias.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // Format to ISO
      const isoDueDate = new Date(dueDate).toISOString();
      await academicApi.createDeadline({
        stageId: selectedStageId,
        title: cleanTitle,
        description: description.trim() || undefined,
        dueDate: isoDueDate,
      });
      onDeadlineCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create academic deadline:', err);
      setErrorMessage(err.message || 'Erro ao cadastrar entrega. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Nova Entrega / Avaliação
              </h2>
              <p className="text-[11px] text-slate-400">
                Cadastre um prazo de trabalho, projeto ou prova acadêmica
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

          {/* Subject & Stage Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label htmlFor="deadline-subject" className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-400" />
                <span>Disciplina <span className="text-rose-500">*</span></span>
              </label>
              <select
                id="deadline-subject"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none transition-all"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Stage Selector */}
            <div className="space-y-1.5">
              <label htmlFor="deadline-stage" className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Etapa <span className="text-rose-500">*</span></span>
              </label>
              <select
                id="deadline-stage"
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                disabled={!currentSubject || !currentSubject.stages || currentSubject.stages.length === 0}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none transition-all disabled:opacity-50"
              >
                {currentSubject?.stages?.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title Field */}
          <div className="space-y-1.5">
            <label htmlFor="deadline-title" className="block text-xs font-bold text-slate-700">
              Título da Entrega <span className="text-rose-500">*</span>
            </label>
            <input
              id="deadline-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Artigo Final de Compiladores, Prova P2..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Due Date & Time Picker */}
          <div className="space-y-1.5">
            <label htmlFor="deadline-due" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-pink-500" />
              <span>Data e Hora Limite (Prazo) <span className="text-rose-500">*</span></span>
            </label>
            <input
              id="deadline-due"
              name="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label htmlFor="deadline-desc" className="block text-xs font-bold text-slate-700">
              Instruções / Detalhes <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <textarea
              id="deadline-desc"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Link para o edital, formato de entrega (PDF/Git), peso na nota..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || !title.trim() || !selectedStageId || !dueDate}
              className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-pink-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Salvar Entrega</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, GraduationCap, Loader2, BookOpen, FileText } from 'lucide-react';
import { academicApi } from '../../services/api';

export interface CreateAcademicSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectCreated: () => void;
}

export const CreateAcademicSubjectModal: React.FC<CreateAcademicSubjectModalProps> = ({
  isOpen,
  onClose,
  onSubjectCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [businessLogic, setBusinessLogic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
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
      setErrorMessage('O nome da disciplina é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await academicApi.createSubject({
        title: cleanTitle,
        description: description.trim() || undefined,
        businessLogic: businessLogic.trim() || undefined,
      });
      onSubjectCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create academic subject:', err);
      setErrorMessage(err.message || 'Erro ao criar disciplina. Tente novamente.');
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
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Nova Disciplina / Matéria
              </h2>
              <p className="text-[11px] text-slate-400">
                Organize aulas, trabalhos e datas de exames acadêmicos
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
            <label htmlFor="subject-title" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-500" />
              <span>Nome da Disciplina <span className="text-rose-500">*</span></span>
            </label>
            <input
              id="subject-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Engenharia de Software II, Cálculo III..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label htmlFor="subject-desc" className="block text-xs font-bold text-slate-700">
              Descrição / Professor <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              id="subject-desc"
              name="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Prof. Carlos • Terças e Quintas 19h"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Business Logic / Syllabus Field */}
          <div className="space-y-1.5">
            <label htmlFor="subject-logic" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Critérios de Avaliação & Ementa <span className="text-slate-400 font-normal">(Opcional)</span></span>
            </label>
            <textarea
              id="subject-logic"
              name="businessLogic"
              rows={3}
              value={businessLogic}
              onChange={(e) => setBusinessLogic(e.target.value)}
              placeholder="Ex: Média final = 0.4*P1 + 0.4*P2 + 0.2*Trabalhos. Mínimo para aprovação: 7.0."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Note about auto-generated stages */}
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-[11px] text-purple-800">
            💡 As etapas padrão (<strong>Matéria & Aulas</strong>, <strong>Trabalhos & Entregas</strong>, <strong>Provas & Avaliações</strong>) serão criadas automaticamente para organizar seu semestre.
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
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <span>Criar Disciplina</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { appointmentsApi } from '../../services/api';

export interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date | null;
  onAppointmentCreated: () => void;
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
  onAppointmentCreated,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Prefill dates on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setLocationOrLink('');
      setDescription('');
      setErrorMessage('');

      const base = defaultDate ? new Date(defaultDate) : new Date();
      base.setHours(9, 0, 0, 0);

      const end = new Date(base);
      end.setHours(10, 0, 0, 0);

      const formatLocalIso = (d: Date) =>
        new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

      setStartTime(formatLocalIso(base));
      setEndTime(formatLocalIso(end));
    }
  }, [isOpen, defaultDate]);

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
      setErrorMessage('O título do compromisso é obrigatório.');
      return;
    }

    if (!startTime || !endTime) {
      setErrorMessage('Defina o horário de início e término.');
      return;
    }

    const startD = new Date(startTime);
    const endD = new Date(endTime);

    if (endD.getTime() < startD.getTime()) {
      setErrorMessage('O horário de término não pode ser anterior ao início.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await appointmentsApi.create({
        title: cleanTitle,
        startTime: startD.toISOString(),
        endTime: endD.toISOString(),
        locationOrLink: locationOrLink.trim() || undefined,
        description: description.trim() || undefined,
      });
      onAppointmentCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create appointment:', err);
      setErrorMessage(err.message || 'Erro ao criar compromisso. Tente novamente.');
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
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Novo Compromisso
              </h2>
              <p className="text-[11px] text-slate-400">
                Agende reuniões, eventos ou sessões de estudo
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
            <label htmlFor="apt-title" className="block text-xs font-bold text-slate-700">
              Título do Compromisso <span className="text-rose-500">*</span>
            </label>
            <input
              id="apt-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Daily Scrum, Alinhamento de TCC, Reunião com Cliente..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="apt-start" className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Início <span className="text-rose-500">*</span></span>
              </label>
              <input
                id="apt-start"
                name="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="apt-end" className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Término <span className="text-rose-500">*</span></span>
              </label>
              <input
                id="apt-end"
                name="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Location or Link */}
          <div className="space-y-1.5">
            <label htmlFor="apt-location" className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Local ou Link de Reunião <span className="text-slate-400 font-normal">(Opcional)</span></span>
            </label>
            <input
              id="apt-location"
              name="locationOrLink"
              type="text"
              value={locationOrLink}
              onChange={(e) => setLocationOrLink(e.target.value)}
              placeholder="Ex: Google Meet, Zoom, Sala 302, Laboratório B..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label htmlFor="apt-desc" className="block text-xs font-bold text-slate-700">
              Descrição / Notas <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <textarea
              id="apt-desc"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pauta da reunião, links de documentos, preparação prévia..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
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
              disabled={isSubmitting || !title.trim() || !startTime || !endTime}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Agendando...</span>
                </>
              ) : (
                <span>Agendar Compromisso</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  ExternalLink,
  GraduationCap,
  FolderKanban,
  CheckCircle2,
  Trash2,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { calendarApi, appointmentsApi } from '../../services/api';
import type { CalendarEventProjection } from '../../types';
import { CreateAppointmentModal } from './CreateAppointmentModal';

export interface CalendarViewProps {
  onSelectProject?: (projectId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onSelectProject }) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEventProjection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter: ALL, APPOINTMENTS, ACADEMIC, TASKS
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'APPOINTMENTS' | 'ACADEMIC' | 'TASKS'>('ALL');

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Action states
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Load events
  const loadEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!silent) setError(null);
      const data = await calendarApi.getEvents({ includeCompleted: true });
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load calendar events:', err);
      if (!silent) setError('Não foi possível carregar os eventos do calendário.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Navigate month
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Toggle appointment completed
  const handleToggleAppointment = async (event: CalendarEventProjection) => {
    if (event.sourceType !== 'APPOINTMENT') return;
    if (togglingEventId) return;

    setTogglingEventId(event.id);
    const newStatus = !event.isCompleted;
    const prevEvents = events;

    // Optimistic UI update
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, isCompleted: newStatus } : e))
    );

    try {
      await appointmentsApi.toggleCompleted(event.sourceId, newStatus);
      loadEvents(true);
    } catch (err) {
      console.error('Failed to toggle appointment:', err);
      setEvents(prevEvents);
      alert('Erro ao atualizar status do compromisso.');
    } finally {
      setTogglingEventId(null);
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (event: CalendarEventProjection) => {
    if (event.sourceType !== 'APPOINTMENT') return;
    if (deletingEventId) return;
    if (!window.confirm(`Excluir o compromisso "${event.title}"?`)) return;

    setDeletingEventId(event.id);
    const prevEvents = events;

    // Optimistic UI update
    setEvents((prev) => prev.filter((e) => e.id !== event.id));

    try {
      await appointmentsApi.delete(event.sourceId);
      loadEvents(true);
    } catch (err) {
      console.error('Failed to delete appointment:', err);
      setEvents(prevEvents);
      alert('Erro ao excluir compromisso.');
    } finally {
      setDeletingEventId(null);
    }
  };

  // Calendar Grid Calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  // Weekday names
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Month Title (PT-BR)
  const monthTitle = new Date(currentYear, currentMonth, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (eventTypeFilter === 'APPOINTMENTS' && e.sourceType !== 'APPOINTMENT') return false;
      if (eventTypeFilter === 'ACADEMIC' && (e.sourceType !== 'TASK_DEADLINE' || e.projectType !== 'ACADEMIC')) return false;
      if (eventTypeFilter === 'TASKS' && (e.sourceType !== 'TASK_DEADLINE' || e.projectType === 'ACADEMIC')) return false;
      return true;
    });
  }, [events, eventTypeFilter]);

  // Events grouped by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventProjection[]> = {};
    for (const ev of filteredEvents) {
      const d = new Date(ev.start);
      // Local date key
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [filteredEvents]);

  // Selected date key
  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayEvents = eventsByDate[selectedDateKey] || [];

  // Sort selected day events by start time
  const sortedSelectedDayEvents = useMemo(() => {
    return [...selectedDayEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [selectedDayEvents]);

  // Today key
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Month grid cells
  const calendarCells = useMemo(() => {
    const cells: {
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      dateObj: Date;
    }[] = [];

    // Prev month padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dateObj = new Date(currentYear, currentMonth - 1, d);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateKey, isCurrentMonth: false, dateObj });
    }

    // Current month cells
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateKey, isCurrentMonth: true, dateObj });
    }

    // Next month padding cells to complete full 35 or 42 grid
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const dateObj = new Date(currentYear, currentMonth + 1, d);
      const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateKey, isCurrentMonth: false, dateObj });
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth, firstDayIndex, prevMonthDays]);

  // Format time HH:mm
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper for chip styling
  const renderEventChip = (ev: CalendarEventProjection) => {
    const isApt = ev.sourceType === 'APPOINTMENT';
    const isAcad = ev.projectType === 'ACADEMIC';

    let chipBg = 'bg-sky-50 text-sky-700 border-sky-200';
    let icon = <FolderKanban className="w-2.5 h-2.5 shrink-0 text-sky-600" />;

    if (isApt) {
      chipBg = ev.isCompleted
        ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
        : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      icon = <Clock className="w-2.5 h-2.5 shrink-0 text-indigo-600" />;
    } else if (isAcad) {
      chipBg = ev.isCompleted
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-pink-50 text-pink-700 border-pink-200';
      icon = <GraduationCap className="w-2.5 h-2.5 shrink-0 text-pink-600" />;
    }

    return (
      <div
        key={ev.id}
        title={`${ev.title} (${formatTime(ev.start)})`}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate ${chipBg}`}
      >
        {icon}
        <span className="truncate">{ev.title}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Calendário & Compromissos
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                    Agenda Unificada
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Visão mensal de compromissos agendados e prazos de entrega dos projetos
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadEvents(false)}
              title="Atualizar eventos"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Novo Compromisso</span>
            </button>
          </div>
        </div>

        {/* Event Legend & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setEventTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos ({events.length})
            </button>
            <button
              onClick={() => setEventTypeFilter('APPOINTMENTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'APPOINTMENTS'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Compromissos</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('ACADEMIC')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'ACADEMIC'
                  ? 'bg-white text-pink-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span>Entregas Acadêmicas</span>
            </button>
            <button
              onClick={() => setEventTypeFilter('TASKS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'TASKS'
                  ? 'bg-white text-sky-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Prazos de Projetos</span>
            </button>
          </div>

          {/* Month Navigator Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-extrabold text-slate-900 capitalize pl-2">
              {monthTitle}
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadEvents(false)} className="font-bold underline hover:text-rose-800">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Main Grid & Agenda Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Calendar Month Grid (Left 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center pb-2 border-b border-slate-100">
            {weekdays.map((day, idx) => (
              <span
                key={day}
                className={`text-xs font-bold uppercase tracking-wider ${
                  idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Month Cells */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-36 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Carregando calendário...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell) => {
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDateKey;
                const dayEvents = eventsByDate[cell.dateKey] || [];
                const visibleEvents = dayEvents.slice(0, 3);
                const extraCount = dayEvents.length - visibleEvents.length;

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => setSelectedDate(cell.dateObj)}
                    className={`min-h-[96px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20 shadow-xs'
                        : cell.isCurrentMonth
                        ? 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50'
                        : 'bg-slate-50/50 border-slate-100 text-slate-300'
                    }`}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isSelected
                            ? 'bg-indigo-100 text-indigo-700'
                            : cell.isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                    </div>

                    {/* Event chips */}
                    <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                      {visibleEvents.map(renderEventChip)}
                      {extraCount > 0 && (
                        <div className="text-[9px] font-bold text-slate-500 pl-1">
                          +{extraCount} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day Agenda Sidebar (Right 1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Agenda do Dia
              </p>
              <h3 className="text-base font-black text-slate-900 capitalize mt-0.5">
                {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </h3>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>
          </div>

          {/* Events List for Selected Day */}
          {sortedSelectedDayEvents.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700">Nenhum evento neste dia</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Clique em "+ Novo" para adicionar um compromisso nesta data.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {sortedSelectedDayEvents.map((ev) => {
                const isApt = ev.sourceType === 'APPOINTMENT';
                const isToggling = togglingEventId === ev.id;
                const isDeleting = deletingEventId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2 ${
                      ev.isCompleted
                        ? 'bg-slate-50 border-slate-200/70 opacity-75'
                        : isApt
                        ? 'bg-indigo-50/40 border-indigo-200/80 shadow-xs'
                        : ev.projectType === 'ACADEMIC'
                        ? 'bg-pink-50/40 border-pink-200/80 shadow-xs'
                        : 'bg-sky-50/40 border-sky-200/80 shadow-xs'
                    }`}
                  >
                    {/* Header: Type Badge + Time + Checkbox */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isApt ? (
                          <button
                            type="button"
                            onClick={() => handleToggleAppointment(ev)}
                            disabled={isToggling}
                            aria-label={ev.isCompleted ? 'Marcar como não concluído' : 'Marcar como concluído'}
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                              ev.isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-indigo-300 hover:border-indigo-600 bg-white'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                            ) : ev.isCompleted ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : null}
                          </button>
                        ) : (
                          <div className="w-5 h-5 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                            {ev.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                        )}

                        <span className="text-xs font-bold text-slate-700">
                          {formatTime(ev.start)}
                          {isApt && ` - ${formatTime(ev.end)}`}
                        </span>
                      </div>

                      {/* Source tag & delete button */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            isApt
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                              : ev.projectType === 'ACADEMIC'
                              ? 'bg-pink-100 text-pink-700 border-pink-200'
                              : 'bg-sky-100 text-sky-700 border-sky-200'
                          }`}
                        >
                          {isApt
                            ? 'Compromisso'
                            : ev.projectType === 'ACADEMIC'
                            ? 'Acadêmico'
                            : 'Projeto'}
                        </span>

                        {isApt && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAppointment(ev)}
                            disabled={isDeleting}
                            aria-label="Excluir compromisso"
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <h4
                        className={`text-sm font-bold leading-tight ${
                          ev.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                        }`}
                      >
                        {ev.title}
                      </h4>
                      {ev.description && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Meta info: location or project/stage link */}
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 flex-wrap">
                      {ev.locationOrLink && (
                        <div className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[200px]">{ev.locationOrLink}</span>
                        </div>
                      )}

                      {ev.projectTitle && (
                        <div className="flex items-center gap-1 font-medium">
                          <FolderKanban className="w-3 h-3 text-slate-400" />
                          <span>{ev.projectTitle}</span>
                          {ev.stageTitle && <span className="text-slate-300">• {ev.stageTitle}</span>}
                          {onSelectProject && (
                            <button
                              type="button"
                              onClick={() => onSelectProject(ev.projectTitle || '')}
                              title="Ver projeto"
                              className="ml-1 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultDate={selectedDate}
        onAppointmentCreated={() => loadEvents(true)}
      />
    </div>
  );
};

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
  const [hasLoadedEvents, setHasLoadedEvents] = useState(false);

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
      const data = await calendarApi.getEvents({ includeCompleted: true });
      setEvents(data);
      setHasLoadedEvents(true);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load calendar events:', err);
      setError('Não foi possível carregar os eventos do calendário.');
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
      if (eventTypeFilter === 'ACADEMIC' && e.sourceType !== 'ACADEMIC_ASSIGNMENT' && !(e.sourceType === 'TASK_DEADLINE' && e.projectType === 'ACADEMIC')) return false;
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
  const eventsUnverified = !hasLoadedEvents && (loading || Boolean(error));
  const eventDetailsUnavailable = Boolean(error) || eventsUnverified;

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

    let chipBg = 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/70';
    let icon = <FolderKanban className="w-2.5 h-2.5 shrink-0 text-sky-600 dark:text-sky-400" />;

    if (isApt) {
      chipBg = ev.isCompleted
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 line-through'
        : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/70';
      icon = <Clock className="w-2.5 h-2.5 shrink-0 text-indigo-600 dark:text-indigo-400" />;
    } else if (isAcad) {
      chipBg = ev.isCompleted
        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
        : 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/70';
      icon = <GraduationCap className="w-2.5 h-2.5 shrink-0 text-pink-600 dark:text-pink-400" />;
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
    <div className="bb-page-stack bb-page-enter motion-reduce:animate-none">
      {/* Calendar heading and controls */}
      <section className="bb-panel p-4 sm:p-6" aria-labelledby="calendar-heading">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="calendar-heading" className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Agenda mensal
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Visão mensal de compromissos agendados e prazos de entrega dos projetos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              onClick={() => loadEvents(false)}
              title="Atualizar eventos"
              aria-label="Atualizar eventos"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              <span>Novo compromisso</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-700 lg:flex-row lg:items-end lg:justify-between">
          {/* Event type filters */}
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Exibir</span>
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800/70">
            <button
              type="button"
              onClick={() => setEventTypeFilter('ALL')}
              aria-pressed={eventTypeFilter === 'ALL'}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white'
              }`}
            >
              Todos ({loading ? '…' : error ? 'indisponível' : events.length})
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter('APPOINTMENTS')}
              aria-pressed={eventTypeFilter === 'APPOINTMENTS'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'APPOINTMENTS'
                  ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300 font-bold'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>Compromissos</span>
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter('ACADEMIC')}
              aria-pressed={eventTypeFilter === 'ACADEMIC'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'ACADEMIC'
                  ? 'bg-white text-pink-700 shadow-sm dark:bg-slate-700 dark:text-pink-300 font-bold'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-pink-500" />
              <span>Entregas Acadêmicas</span>
            </button>
            <button
              type="button"
              onClick={() => setEventTypeFilter('TASKS')}
              aria-pressed={eventTypeFilter === 'TASKS'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                eventTypeFilter === 'TASKS'
                  ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300 font-bold'
                  : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Prazos de Projetos</span>
            </button>
          </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Hoje
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="min-w-[9rem] pl-1 text-base font-bold capitalize text-slate-900 dark:text-slate-100 sm:text-lg">
              {monthTitle}
            </span>
          </div>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadEvents(false)} className="font-bold underline hover:text-rose-800 dark:hover:text-rose-300">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Main Grid & Agenda Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Calendar Month Grid (Left 2 cols) */}
        <div className="bb-panel space-y-4 p-3 sm:p-6 lg:col-span-2">
          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 border-b border-slate-100 dark:border-slate-700 pb-2 text-center">
            {weekdays.map((day, idx) => (
              <span
                key={day}
                className={`text-xs font-semibold ${
                  idx === 0 || idx === 6 ? 'text-slate-400 dark:text-slate-400' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Month Cells */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-36 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin motion-reduce:animate-none" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Carregando calendário...</p>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarCells.map((cell) => {
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDateKey;
                const dayEvents = eventsByDate[cell.dateKey] || [];
                const visibleEvents = dayEvents.slice(0, 3);
                const extraCount = dayEvents.length - visibleEvents.length;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateObj)}
                    aria-pressed={isSelected}
                        aria-label={`${cell.dateObj.toLocaleDateString('pt-BR', { dateStyle: 'full' })}${eventsUnverified ? (loading ? ', carregando eventos' : ', eventos indisponíveis') : dayEvents.length ? `, ${dayEvents.length} evento${dayEvents.length === 1 ? '' : 's'}` : ', sem eventos'}`}
                    className={`min-h-12 sm:min-h-[96px] w-full p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 motion-reduce:transition-none ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/50 shadow-xs'
                        : cell.isCurrentMonth
                        ? 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                        : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-500'
                    }`}
                  >
                    {/* Date Number Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : isSelected
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                            : cell.isCurrentMonth
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                    </div>

                    {/* Event chips */}
                    <div className="hidden space-y-1 mt-1 flex-1 overflow-hidden sm:block">
                      {visibleEvents.map(renderEventChip)}
                      {extraCount > 0 && (
                        <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                          +{extraCount} mais
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day Agenda Sidebar (Right 1 col) */}
        <div className="bb-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 capitalize">
                {selectedDate.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}
              </h3>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>
          </div>

          {/* Events List for Selected Day */}
          {sortedSelectedDayEvents.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{eventDetailsUnavailable ? (loading && !hasLoadedEvents ? 'Carregando eventos…' : 'Agenda indisponível') : 'Nenhum evento neste dia'}</h4>
                <p className="text-xs text-slate-400 dark:text-slate-400 max-w-xs mx-auto">
                  {eventDetailsUnavailable ? (loading && !hasLoadedEvents ? 'Carregando eventos…' : 'Não é possível confirmar os eventos desta data.') : 'Clique em "+ Novo" para adicionar um compromisso nesta data.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden max-h-[560px] overflow-y-auto">
              {sortedSelectedDayEvents.map((ev) => {
                const isApt = ev.sourceType === 'APPOINTMENT';
                const isToggling = togglingEventId === ev.id;
                const isDeleting = deletingEventId === ev.id;

                return (
                  <div
                    key={ev.id}
                    className={`p-3.5 transition-colors space-y-2 ${
                      ev.isCompleted
                        ? 'bg-slate-50/50 dark:bg-slate-800/40 opacity-75'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
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
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                              ev.isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-indigo-300 dark:border-indigo-800/70 hover:border-indigo-600 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-3 h-3 animate-spin text-slate-400 dark:text-slate-400" />
                            ) : ev.isCompleted ? (
                              <Check className="w-3 h-3 stroke-[3]" />
                            ) : null}
                          </button>
                        ) : (
                          <div className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            {ev.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                            )}
                          </div>
                        )}

                        <span className="bb-tabular font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {formatTime(ev.start)}
                          {isApt && ` - ${formatTime(ev.end)}`}
                        </span>
                      </div>

                      {/* Source tag & delete button */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
                            isApt
                              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/70'
                              : ev.projectType === 'ACADEMIC'
                              ? 'bg-pink-50 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/70'
                              : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/70'
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
                            className="text-slate-400 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1 rounded-lg transition-colors"
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
                        className={`text-sm font-semibold leading-tight ${
                          ev.isCompleted ? 'text-slate-400 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {ev.title}
                      </h4>
                      {ev.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                    </div>

                    {/* Meta info: location or project/stage link */}
                    <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {ev.locationOrLink && (
                        <div className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                          <span className="truncate max-w-[200px]">{ev.locationOrLink}</span>
                        </div>
                      )}

                      {ev.projectTitle && (
                        <div className="flex items-center gap-1 font-medium">
                          <FolderKanban className="w-3 h-3 text-slate-400 dark:text-slate-400" />
                          <span>{ev.projectTitle}</span>
                          {ev.stageTitle && <span className="text-slate-300 dark:text-slate-500">• {ev.stageTitle}</span>}
                          {onSelectProject && (
                            <button
                              type="button"
                              onClick={() => onSelectProject(ev.projectTitle || '')}
                              title="Ver projeto"
                              aria-label={`Ver projeto ${ev.projectTitle}`}
                              className="ml-1 rounded p-0.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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

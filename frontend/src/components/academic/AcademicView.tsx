import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  BookOpen,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  Check,
  CheckSquare,
} from 'lucide-react';
import { academicApi } from '../../services/api';
import type { AcademicSubject, AcademicDeadlineItem, TaskStatus } from '../../types';
import { CreateAcademicSubjectModal } from './CreateAcademicSubjectModal';
import { CreateDeadlineModal } from './CreateDeadlineModal';

export interface AcademicViewProps {
  onSelectProject?: (projectId: string) => void;
}

export const AcademicView: React.FC<AcademicViewProps> = ({ onSelectProject }) => {
  const [activeTab, setActiveTab] = useState<'DEADLINES' | 'SUBJECTS'>('DEADLINES');
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [deadlines, setDeadlines] = useState<AcademicDeadlineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState<boolean>(false);
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState<boolean>(false);
  const [defaultSubjectForDeadline, setDefaultSubjectForDeadline] = useState<string | undefined>(undefined);

  // Action loading states
  const [togglingDeadlineId, setTogglingDeadlineId] = useState<string | null>(null);
  const [deletingDeadlineId, setDeletingDeadlineId] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      if (!silent) setError(null);
      const [subjectsRes, deadlinesRes] = await Promise.all([
        academicApi.listSubjects(),
        academicApi.listDeadlines({ includeCompleted: true }),
      ]);
      setSubjects(subjectsRes);
      setDeadlines(deadlinesRes);
    } catch (err: any) {
      console.error('Failed to load academic data:', err);
      if (!silent) setError('Não foi possível carregar os dados acadêmicos.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle deadline completion
  const handleToggleDeadline = async (deadline: AcademicDeadlineItem) => {
    if (togglingDeadlineId) return;
    setTogglingDeadlineId(deadline.id);
    const newStatus: TaskStatus = deadline.status === 'DONE' ? 'TODO' : 'DONE';
    const prevDeadlines = deadlines;

    // Optimistic UI update
    setDeadlines((prev) =>
      prev.map((d) => (d.id === deadline.id ? { ...d, status: newStatus } : d))
    );

    try {
      await academicApi.updateDeadline(deadline.id, { status: newStatus });
      loadData(true);
    } catch (err) {
      console.error('Failed to toggle deadline status:', err);
      setDeadlines(prevDeadlines);
      alert('Erro ao atualizar status da entrega.');
    } finally {
      setTogglingDeadlineId(null);
    }
  };

  // Delete deadline
  const handleDeleteDeadline = async (id: string, title: string) => {
    if (deletingDeadlineId) return;
    if (!window.confirm(`Excluir a entrega "${title}"?`)) return;

    setDeletingDeadlineId(id);
    const prevDeadlines = deadlines;

    // Optimistic UI update
    setDeadlines((prev) => prev.filter((d) => d.id !== id));

    try {
      await academicApi.deleteDeadline(id);
      loadData(true);
    } catch (err) {
      console.error('Failed to delete deadline:', err);
      setDeadlines(prevDeadlines);
      alert('Erro ao excluir entrega.');
    } finally {
      setDeletingDeadlineId(null);
    }
  };

  // KPIs
  const totalSubjects = subjects.length;
  const pendingDeadlines = deadlines.filter((d) => d.status !== 'DONE');
  const completedDeadlines = deadlines.filter((d) => d.status === 'DONE');
  const upcomingSevenDays = deadlines.filter(
    (d) => d.status !== 'DONE' && d.daysRemaining >= 0 && d.daysRemaining <= 7
  );

  // Filtered deadlines
  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((d) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesSubject = d.subjectTitle?.toLowerCase().includes(q);
        const matchesDesc = d.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesDesc) return false;
      }

      // Subject filter
      if (selectedSubjectFilter !== 'ALL' && d.subjectId !== selectedSubjectFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'PENDING' && d.status === 'DONE') return false;
      if (statusFilter === 'DONE' && d.status !== 'DONE') return false;

      return true;
    });
  }, [deadlines, searchQuery, selectedSubjectFilter, statusFilter]);

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    const q = searchQuery.toLowerCase().trim();
    return subjects.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subjects, searchQuery]);

  // Helper for deadline countdown badge
  const renderCountdownBadge = (deadline: AcademicDeadlineItem) => {
    if (deadline.status === 'DONE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Concluído</span>
        </span>
      );
    }

    if (deadline.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
          <Clock className="w-3.5 h-3.5" />
          <span>Atrasado ({Math.abs(deadline.daysRemaining)}d)!</span>
        </span>
      );
    }

    if (deadline.daysRemaining === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5" />
          <span>Entrega Hoje!</span>
        </span>
      );
    }

    if (deadline.daysRemaining === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Amanhã</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
        <Calendar className="w-3.5 h-3.5" />
        <span>{deadline.daysRemaining} dias restantes</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Área Acadêmica
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                    Faculdade & Cursos
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Controle de disciplinas, entregas de trabalhos, projetos e datas de exames
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(false)}
              title="Atualizar dados acadêmicos"
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Disciplina</span>
            </button>

            <button
              onClick={() => {
                setDefaultSubjectForDeadline(undefined);
                setIsDeadlineModalOpen(true);
              }}
              disabled={subjects.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-98"
            >
              <Calendar className="w-4 h-4" />
              <span>+ Nova Entrega</span>
            </button>
          </div>
        </div>

        {/* Academic KPIs Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Matérias Ativas</p>
            <p className="text-2xl font-black text-purple-800 mt-0.5">{totalSubjects}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Entregas Pendentes</p>
            <p className="text-2xl font-black text-rose-700 mt-0.5">{pendingDeadlines.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Próximos 7 Dias</p>
            <p className="text-2xl font-black text-amber-700 mt-0.5">{upcomingSevenDays.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Concluídas</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{completedDeadlines.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('DEADLINES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'DEADLINES'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Entregas & Deadlines</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800">
              {deadlines.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SUBJECTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'SUBJECTS'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Disciplinas & Matérias</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800">
              {subjects.length}
            </span>
          </button>
        </div>

        {/* Search & Select Filters */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar entregas ou matérias..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-xs"
            />
          </div>

          {activeTab === 'DEADLINES' && subjects.length > 0 && (
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 shadow-xs"
            >
              <option value="ALL">Todas as Disciplinas</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.title}
                </option>
              ))}
            </select>
          )}

          {activeTab === 'DEADLINES' && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'PENDING' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter('DONE')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  statusFilter === 'DONE' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                Concluídas
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadData(false)} className="font-bold underline hover:text-rose-800">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Carregando dados acadêmicos...</p>
        </div>
      ) : activeTab === 'DEADLINES' ? (
        /* Tab 1: Deadlines / To-Do List View */
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-extrabold text-slate-800">
                Lista de Entregas & Prazos
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {filteredDeadlines.length} {filteredDeadlines.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          {filteredDeadlines.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-800">Tudo em dia por aqui!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || selectedSubjectFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'Nenhuma entrega encontrada com os filtros selecionados.'
                    : 'Nenhuma entrega cadastrada. Adicione trabalhos, projetos e provas para nunca perder um prazo.'}
                </p>
              </div>
              {subjects.length > 0 ? (
                <button
                  onClick={() => setIsDeadlineModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeira Entrega</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Cadastrar Primeira Disciplina</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDeadlines.map((deadline) => {
                const isDone = deadline.status === 'DONE';
                const isToggling = togglingDeadlineId === deadline.id;
                const isDeleting = deletingDeadlineId === deadline.id;

                // Format due date in PT-BR
                const due = new Date(deadline.dueDate);
                const formattedDate = due.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={deadline.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                      isDone
                        ? 'bg-slate-50/60 border-slate-200/60 opacity-80'
                        : deadline.isOverdue
                        ? 'bg-rose-50/40 border-rose-200/80 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:border-purple-300 shadow-xs'
                    }`}
                  >
                    {/* Left: Checkbox + Title + Meta */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Interactive checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleDeadline(deadline)}
                        disabled={isToggling}
                        aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluído'}
                        className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 hover:border-purple-500 bg-white'
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        ) : isDone ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : null}
                      </button>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`text-sm font-bold truncate ${
                              isDone ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}
                          >
                            {deadline.title}
                          </h4>

                          {/* Subject Badge */}
                          {deadline.subjectTitle && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <BookOpen className="w-3 h-3" />
                              <span>{deadline.subjectTitle}</span>
                            </span>
                          )}

                          {/* Stage Badge */}
                          {deadline.stageTitle && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                              <Layers className="w-3 h-3" />
                              <span>{deadline.stageTitle}</span>
                            </span>
                          )}
                        </div>

                        {deadline.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
                            {deadline.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>Data Limite: {formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Countdown badge & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                      {renderCountdownBadge(deadline)}

                      <button
                        type="button"
                        onClick={() => handleDeleteDeadline(deadline.id, deadline.title)}
                        disabled={isDeleting}
                        aria-label="Excluir entrega"
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Subjects / Disciplinas Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-800">
              Minhas Disciplinas Cadastradas ({filteredSubjects.length})
            </h3>
            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Disciplina</span>
            </button>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-slate-800">Nenhuma disciplina cadastrada</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Cadastre as matérias do seu semestre para organizar tarefas, notas e entregas.
                </p>
              </div>
              <button
                onClick={() => setIsSubjectModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Disciplina</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((subject) => {
                const pendingCount = subject.pendingDeadlinesCount || 0;
                const totalStages = subject.stages?.length || subject.totalStages || 0;

                return (
                  <div
                    key={subject.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card hover:shadow-card-hover hover:border-purple-300 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        {pendingCount > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {pendingCount} {pendingCount === 1 ? 'pendência' : 'pendências'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Em dia
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                          {subject.title}
                        </h4>
                        {subject.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {subject.description}
                          </p>
                        )}
                      </div>

                      {/* Stages list */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Etapas ({totalStages})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {subject.stages?.map((st) => (
                            <span
                              key={st.id}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600"
                            >
                              {st.title}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Business Logic / Assessment Criteria preview */}
                      {subject.businessLogic && (
                        <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-[11px] text-purple-800 line-clamp-2 font-mono">
                          {subject.businessLogic}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setDefaultSubjectForDeadline(subject.id);
                          setIsDeadlineModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1 py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold border border-purple-200 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nova Entrega</span>
                      </button>

                      {onSelectProject && (
                        <button
                          onClick={() => onSelectProject(subject.id)}
                          title="Abrir quadro kanban desta disciplina"
                          className="flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateAcademicSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSubjectCreated={() => loadData(true)}
      />

      <CreateDeadlineModal
        isOpen={isDeadlineModalOpen}
        onClose={() => {
          setIsDeadlineModalOpen(false);
          setDefaultSubjectForDeadline(undefined);
        }}
        subjects={subjects}
        defaultSubjectId={defaultSubjectForDeadline}
        onDeadlineCreated={() => loadData(true)}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Calendar, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { academicApi } from '../../services/api';
import type { AcademicSubject, AcademicAssignment, AssignmentStatus } from '../../types';
import { getProjectCover } from '../../utils/projectCover';
import { CreateSubjectModal } from './CreateSubjectModal';
import { CreateAssignmentModal } from './CreateAssignmentModal';

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const assignmentTypeLabel = (type: AcademicAssignment['type']) => ({
  HOMEWORK: 'Tarefa',
  EXAM: 'Prova',
  PROJECT: 'Projeto',
  PRESENTATION: 'Apresentação',
  READING: 'Leitura',
  OTHER: 'Outro',
}[type]);

const formatDateOnly = (value: string) => {
  const dateKey = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return new Date(value).toLocaleDateString('pt-BR');
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
};

export const AcademicView: React.FC = () => {
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState(false);

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeSubjectId) {
      loadAssignments(activeSubjectId);
    } else {
      setAssignments([]);
    }
  }, [activeSubjectId]);

  const loadData = async () => {
    setLoading(true);
    setSubjectsError(false);
    try {
      const subs = await academicApi.listSubjects();
      setSubjects(subs);
      if (subs.length > 0) {
        if (!activeSubjectId || !subs.some((s) => s.id === activeSubjectId)) {
          setActiveSubjectId(subs[0].id);
        }
      } else {
        setActiveSubjectId(null);
      }
    } catch (err) {
      console.error('Failed to load academic subjects:', err);
      setSubjectsError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (subjectId: string) => {
    setAssignmentsLoading(true);
    setAssignmentsError(false);
    try {
      const data = await academicApi.listAssignments(subjectId);
      setAssignments(data);
    } catch (err: any) {
      console.error(`Failed to load assignments for subject ${subjectId}:`, err);
      setAssignments([]);
      setAssignmentsError(true);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const handleCreateSubject = async (input: any) => {
    try {
      const newSub = await academicApi.createSubject(input);
      setSubjects([...subjects, newSub]);
      setActiveSubjectId(newSub.id);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Excluir esta matéria e todas as suas atividades?')) return;
    try {
      await academicApi.deleteSubject(id);
      if (activeSubjectId === id) setActiveSubjectId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAssignment = async (input: any) => {
    if (!activeSubjectId) return;
    
    try {
      await academicApi.createAssignment({
        ...input,
        subjectId: activeSubjectId,
        status: 'TODO'
      });
      loadAssignments(activeSubjectId);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleUpdateAssignmentStatus = async (id: string, status: AssignmentStatus) => {
    try {
      await academicApi.updateAssignment(id, { status });
      setAssignments(assignments.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Excluir atividade?')) return;
    try {
      await academicApi.deleteAssignment(id);
      setAssignments(assignments.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando...</div>;
  }

  const todoAssignments = assignments.filter(a => a.status === 'TODO');
  const inProgressAssignments = assignments.filter(a => a.status === 'IN_PROGRESS');
  const doneAssignments = assignments.filter(a => a.status === 'DONE');
  const todayDateKey = localDateKey(new Date());
  const isOverdue = (task: AcademicAssignment) =>
    task.status !== 'DONE' && Boolean(task.dueDate) && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate!.slice(0, 10)) && task.dueDate!.slice(0, 10) < todayDateKey;
  const renderDueDate = (task: AcademicAssignment) => {
    if (!task.dueDate) return null;
    const overdue = isOverdue(task);
    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${overdue ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50' : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'}`}>
        <Calendar className="w-3 h-3" />
        {overdue && <span className="font-semibold">Atrasada ·</span>}
        <span className="bb-tabular font-mono">{formatDateOnly(task.dueDate)}</span>
      </span>
    );
  };

  return (
    <div className="bb-page-stack bb-page-enter motion-reduce:animate-none">
    <section className="bb-panel p-6 sm:p-7">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Matérias e entregas</h2>
      <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Organize atividades e acompanhe prazos por matéria.</p>
    </section>
    <div className={`bb-panel flex ${subjectsError ? 'min-h-0 lg:flex-col' : 'min-h-[420px] lg:flex-row'} flex-col overflow-hidden`}>
      {/* Sidebar: Subjects List */}
      <div className={`flex w-full shrink-0 flex-col border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70 ${subjectsError ? 'lg:border-b' : 'lg:w-72 lg:border-b-0 lg:border-r'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Matérias
          </h2>
          <button 
            onClick={() => setIsSubjectModalOpen(true)}
            aria-label="Criar matéria"
            className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {!subjectsError && (
          <div className="max-h-52 flex-1 space-y-1 overflow-y-auto p-3 lg:max-h-none">
            {subjects.length === 0 ? (
              <div className="text-center p-4 text-xs text-slate-500 dark:text-slate-400">
                Nenhuma matéria cadastrada.
              </div>
            ) : (
              subjects.map(sub => (
                <div
                  key={sub.id}
                  className={`group flex items-center gap-1.5 rounded-xl p-1.5 transition-colors ${
                    activeSubjectId === sub.id
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800/60'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubjectId(sub.id)}
                    aria-pressed={activeSubjectId === sub.id}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                  >
                    <div className="relative h-8 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200/60 bg-slate-900 dark:border-slate-700/60">
                      <img
                        src={getProjectCover(sub.id)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover opacity-90"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="min-w-0 flex-1 truncate">{sub.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubject(sub.id)}
                    aria-label={`Excluir matéria ${sub.title}`}
                    className="mr-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Content: To-Do List */}
      <div className={`flex min-w-0 flex-1 flex-col ${subjectsError ? 'min-h-0' : 'min-h-[420px]'}`}>
        {subjectsError ? (
          <div role="alert" className="m-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <p>As matérias não estão disponíveis porque houve uma falha ao carregá-las.</p>
            <button type="button" onClick={() => void loadData()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-900"><RefreshCw className="h-4 w-4" />Tentar novamente</button>
          </div>
        ) : !activeSubjectId ? (
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            <img src="/assets/empty-workspace.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[.06]" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <BookOpen className="relative w-12 h-12 mb-4 text-indigo-400" />
            <p className="relative">Selecione ou crie uma matéria para ver suas atividades.</p>
          </div>
        ) : (
          <div className="flex-1 p-5 sm:p-8">
            <div className="max-w-3xl mx-auto">
              
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 dark:border-slate-700">
                    <img
                      src={getProjectCover(activeSubjectId)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover opacity-90"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {subjects.find(s => s.id === activeSubjectId)?.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Gerencie suas provas, trabalhos e tarefas desta matéria.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAssignmentModalOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Atividade</span>
                </button>
              </div>

              {/* To-Do Section */}
              <div className="mb-8">
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Para fazer</span>
                  <span className="bb-tabular font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">({todoAssignments.length})</span>
                </h3>
                
                {assignmentsLoading ? (
                  <p role="status" className="rounded-2xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Carregando atividades…</p>
                ) : assignmentsError ? (
                  <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                    <p>Não foi possível carregar as atividades desta matéria.</p>
                    <button type="button" onClick={() => void loadAssignments(activeSubjectId)} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-900"><RefreshCw className="h-4 w-4" />Tentar novamente</button>
                  </div>
                ) : todoAssignments.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-sm text-slate-400 dark:text-slate-400">
                    Nenhuma atividade pendente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todoAssignments.map(task => (
                      <div key={task.id} className="bb-panel-muted bb-card-motion group flex items-start gap-4 p-4 hover:border-indigo-300 dark:hover:border-indigo-800/70">
                        <button 
                          type="button"
                          onClick={() => handleUpdateAssignmentStatus(task.id, 'DONE')}
                          aria-label={`Concluir ${task.title}`}
                          className="mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{task.title}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{assignmentTypeLabel(task.type)}</span>
                            {renderDueDate(task)}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteAssignment(task.id)}
                          aria-label={`Excluir atividade ${task.title}`}
                          className="shrink-0 rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition-colors motion-reduce:transition-none hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-500 dark:hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* In Progress Section */}
              {(inProgressAssignments.length > 0 || (!assignmentsLoading && !assignmentsError)) && (
                <div className="mb-8">
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Em andamento</span>
                    <span className="bb-tabular font-mono text-xs font-semibold">({inProgressAssignments.length})</span>
                  </h3>
                  {inProgressAssignments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-400">
                      Nenhuma atividade em andamento.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {inProgressAssignments.map(task => (
                        <div key={task.id} className="bb-panel-muted bb-card-motion group flex items-start gap-4 p-4 hover:border-indigo-300 dark:hover:border-indigo-800/70">
                          <button
                            type="button"
                            onClick={() => handleUpdateAssignmentStatus(task.id, 'DONE')}
                            aria-label={`Concluir ${task.title}`}
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-indigo-400 text-indigo-600 transition-colors hover:border-emerald-500 hover:text-emerald-600 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{task.title}</p>
                            <div className="mt-1.5 flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                              <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">Em andamento</span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{assignmentTypeLabel(task.type)}</span>
                              {renderDueDate(task)}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateAssignmentStatus(task.id, 'TODO')}
                              aria-label={`Mover ${task.title} para Para Fazer`}
                              title="Mover para Para Fazer"
                              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(task.id)}
                              aria-label={`Excluir atividade ${task.title}`}
                              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Done Section */}
              {doneAssignments.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>Concluídas</span>
                    <span className="bb-tabular font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">({doneAssignments.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {doneAssignments.map(task => (
                      <div key={task.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => handleUpdateAssignmentStatus(task.id, 'TODO')}
                          aria-label={`Reabrir ${task.title}`}
                          className="shrink-0 rounded-md text-emerald-600 dark:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-500 dark:text-slate-400 text-sm line-through decoration-slate-300">{task.title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(task.id)}
                          aria-label={`Excluir atividade ${task.title}`}
                          className="shrink-0 rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-500 dark:hover:text-rose-400 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
      <CreateSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onCreateSubject={handleCreateSubject}
      />
      <CreateAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        onCreateAssignment={handleCreateAssignment}
      />
    </div></div>
  );
};

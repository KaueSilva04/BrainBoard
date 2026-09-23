import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Calendar, Clock, CheckCircle2, GraduationCap } from 'lucide-react';
import { academicApi } from '../../services/api';
import type { AcademicSubject, AcademicAssignment, AssignmentStatus } from '../../types';

export const AcademicView: React.FC = () => {
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    try {
      const subs = await academicApi.listSubjects();
      setSubjects(subs);
      if (subs.length > 0 && !activeSubjectId) {
        setActiveSubjectId(subs[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (subjectId: string) => {
    try {
      const data = await academicApi.listAssignments(subjectId);
      setAssignments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubject = async () => {
    const title = prompt('Nome da Matéria (ex: Cálculo I):');
    if (!title) return;
    try {
      const newSub = await academicApi.createSubject({ title });
      setSubjects([...subjects, newSub]);
      setActiveSubjectId(newSub.id);
    } catch (err) {
      console.error(err);
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

  const handleCreateAssignment = async () => {
    if (!activeSubjectId) return;
    const title = prompt('O que você precisa fazer? (ex: Estudar para P1, Lista de Exercícios)');
    if (!title) return;
    
    try {
      await academicApi.createAssignment({
        title,
        subjectId: activeSubjectId,
        type: 'HOMEWORK',
        status: 'TODO'
      });
      loadAssignments(activeSubjectId);
    } catch (err) {
      console.error(err);
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
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  const todoAssignments = assignments.filter(a => a.status === 'TODO');
  const doneAssignments = assignments.filter(a => a.status === 'DONE');

  return (
    <div className="flex h-full bg-slate-50/50">
      {/* Sidebar: Subjects List */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-600" />
            Matérias
          </h2>
          <button 
            onClick={handleCreateSubject}
            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {subjects.length === 0 ? (
            <div className="text-center p-4 text-xs text-slate-500">
              Nenhuma matéria cadastrada.
            </div>
          ) : (
            subjects.map(sub => (
              <button
                key={sub.id}
                onClick={() => setActiveSubjectId(sub.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all group flex items-center justify-between ${
                  activeSubjectId === sub.id 
                    ? 'bg-purple-50 text-purple-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="truncate pr-2">{sub.title}</span>
                <Trash2 
                  className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                    activeSubjectId === sub.id ? 'text-purple-400 hover:text-purple-600' : 'text-slate-400 hover:text-rose-500'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSubject(sub.id);
                  }}
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: To-Do List */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!activeSubjectId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <BookOpen className="w-12 h-12 mb-4 text-slate-200" />
            <p>Selecione ou crie uma matéria para ver suas atividades.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    {subjects.find(s => s.id === activeSubjectId)?.title}
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">Gerencie suas provas, trabalhos e tarefas desta matéria.</p>
                </div>
                <button
                  onClick={handleCreateAssignment}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova Atividade</span>
                </button>
              </div>

              {/* To-Do Section */}
              <div className="mb-8">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Para Fazer ({todoAssignments.length})
                </h3>
                
                {todoAssignments.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-400">
                    Nenhuma atividade pendente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todoAssignments.map(task => (
                      <div key={task.id} className="group bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-start gap-4 hover:border-purple-300 transition-colors">
                        <button 
                          onClick={() => handleUpdateAssignmentStatus(task.id, 'DONE')}
                          className="mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 border-slate-300 hover:border-purple-500 transition-colors"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{task.title}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100">{task.type}</span>
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteAssignment(task.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Done Section */}
              {doneAssignments.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Concluídas ({doneAssignments.length})
                  </h3>
                  <div className="space-y-2 opacity-60">
                    {doneAssignments.map(task => (
                      <div key={task.id} className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center gap-4">
                        <button 
                          onClick={() => handleUpdateAssignmentStatus(task.id, 'TODO')}
                          className="shrink-0 text-emerald-500"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-500 text-sm line-through decoration-slate-300">{task.title}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteAssignment(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors shrink-0"
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
    </div>
  );
};

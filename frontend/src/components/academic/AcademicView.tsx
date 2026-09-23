import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { academicApi } from '../../services/api';
import type { AcademicTerm, AcademicSubject } from '../../types';

export const AcademicView: React.FC = () => {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const data = await academicApi.listTerms();
      setTerms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerm = async () => {
    const title = prompt('Nome do Semestre/Período:');
    if (!title) return;
    try {
      await academicApi.createTerm({ title });
      loadTerms();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!window.confirm('Excluir este semestre e todas as suas disciplinas?')) return;
    try {
      await academicApi.deleteTerm(id);
      loadTerms();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Área Acadêmica</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seus semestres, disciplinas e avaliações.</p>
        </div>
        <button
          onClick={handleCreateTerm}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Semestre</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : terms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <BookOpen className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Nenhum semestre cadastrado</h3>
          <p className="text-slate-500 mt-1">Comece criando o seu período acadêmico atual.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {terms.map(term => (
            <div key={term.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h2 className="text-lg font-bold text-slate-800">{term.title}</h2>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md">
                    {term.status}
                  </span>
                  <button onClick={() => handleDeleteTerm(term.id)} className="text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Render Subjects inside the Term */}
              <SubjectList termId={term.id} initialSubjects={term.subjects || []} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SubjectList: React.FC<{ termId: string; initialSubjects: AcademicSubject[] }> = ({ termId, initialSubjects }) => {
  const [subjects, setSubjects] = useState<AcademicSubject[]>(initialSubjects);

  const loadSubjects = async () => {
    const data = await academicApi.listSubjects(termId);
    setSubjects(data);
  };

  const handleCreateSubject = async () => {
    const title = prompt('Nome da Disciplina (ex: Cálculo I):');
    if (!title) return;
    await academicApi.createSubject({ title, termId });
    loadSubjects();
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Excluir disciplina e avaliações?')) return;
    await academicApi.deleteSubject(id);
    loadSubjects();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-600">Disciplinas ({subjects.length})</h3>
        <button
          onClick={handleCreateSubject}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Disciplina
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map(subject => (
          <div key={subject.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-800 text-sm">{subject.title}</h4>
              <button onClick={() => handleDeleteSubject(subject.id)} className="text-slate-400 hover:text-rose-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {subject.professor && <p className="text-xs text-slate-500 mb-2">Prof: {subject.professor}</p>}
            
            {/* Assignments Placeholder */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-400 font-medium">Avaliações</p>
              {/* Future feature: Render Assignments here */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

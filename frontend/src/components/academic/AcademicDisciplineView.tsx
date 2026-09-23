import React from 'react';
import { Project, Stage, Task, TaskStatus } from '../../types';
import { BookOpen, Calendar, CheckCircle2, Clock, PlayCircle, Plus, AlertCircle, FileText } from 'lucide-react';

interface AcademicDisciplineViewProps {
  project: Project;
  stages: Stage[];
  tasks: Task[];
  onOpenCreateTask: (stageId?: string) => void;
  onOpenCreateStage: () => void;
  onMoveTask?: (id: string, newStatus: TaskStatus) => void;
}

export const AcademicDisciplineView: React.FC<AcademicDisciplineViewProps> = ({
  project,
  stages,
  tasks,
  onOpenCreateTask,
  onOpenCreateStage,
}) => {
  // Group tasks by stage
  const tasksByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = tasks.filter((t) => t.stageId === stage.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'DONE': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'IN_PROGRESS': return <PlayCircle className="w-4 h-4 text-indigo-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header: Syllabus & Ementa */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-card flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{project.title}</h2>
              {project.description && (
                <p className="text-sm text-slate-500 mt-1">{project.description}</p>
              )}
            </div>
          </div>
          
          {project.businessLogic && (
            <div className="mt-4 p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
              <div className="flex items-center gap-2 mb-2 text-purple-800 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>Ementa & Critérios de Avaliação</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                {project.businessLogic}
              </p>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-800">{tasks.filter(t => t.status === 'DONE').length} / {tasks.length}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Entregas Concluídas</span>
          </div>
          <button
            onClick={onOpenCreateStage}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Módulo/Bimestre</span>
          </button>
        </div>
      </div>

      {/* Modules/Bimestres Timeline */}
      <div className="space-y-6">
        <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <span>Cronograma da Disciplina</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
            {stages.length} Módulos
          </span>
        </h3>

        {stages.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Nenhum módulo cadastrado</p>
            <p className="text-xs text-slate-500 mt-1">Adicione unidades ou bimestres para organizar as entregas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stages.map((stage) => {
              const stageTasks = tasksByStage[stage.id] || [];
              const progress = stageTasks.length > 0 
                ? Math.round((stageTasks.filter(t => t.status === 'DONE').length / stageTasks.length) * 100) 
                : 0;

              return (
                <div key={stage.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                  {/* Module Header */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-extrabold text-slate-800 truncate pr-4">{stage.title}</h4>
                      <span className="text-xs font-bold text-slate-400">{progress}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-purple-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="p-4 flex-1 bg-white space-y-3">
                    {stageTasks.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-400 font-medium">
                        Nenhuma entrega registrada
                      </div>
                    ) : (
                      stageTasks.map((task) => {
                        const isDone = task.status === 'DONE';
                        return (
                          <div 
                            key={task.id} 
                            onClick={() => onOpenCreateTask(task.stageId)} // Em um cenario real, abriria o modal de edição
                            className={`group flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                              isDone ? 'bg-slate-50 border-slate-200/60 opacity-70' : 'bg-white border-slate-200 hover:border-purple-300 shadow-xs'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 shrink-0">{getStatusIcon(task.status)}</div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-bold truncate ${isDone ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                  {task.title}
                                </p>
                                {task.dueDate && (
                                  <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-slate-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Task Button */}
                  <div className="p-3 border-t border-slate-50 bg-white">
                    <button
                      onClick={() => onOpenCreateTask(stage.id)}
                      className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Entrega</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

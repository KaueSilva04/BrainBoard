import React from 'react';
import { Layers, PlayCircle, CheckCircle2, ArrowUpRight } from 'lucide-react';
import type { Task } from '../types';

interface DashboardOverviewProps {
  tasks: Task[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total de Tarefas */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Total de Tarefas
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/80 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {totalTasks}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="text-amber-600 font-semibold">{todoTasks}</span> pendentes no quadro
          </p>
        </div>
      </div>

      {/* Card 2: Em Andamento */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Em Andamento
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <PlayCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {inProgressTasks}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="text-indigo-600 font-semibold">{inProgressTasks}</span> ativas agora
          </p>
        </div>
      </div>

      {/* Card 3: Concluídas */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            Concluídas
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {doneTasks}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span className="text-emerald-600 font-semibold">{completionRate}%</span> taxa de sucesso
          </p>
        </div>
      </div>

      {/* Card 4: Progresso Geral (Donut Ring Chart) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between">
        <div className="flex flex-col justify-between h-full pr-2">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 tracking-wide uppercase">
            <span>Progresso Geral</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{todoTasks} A Fazer</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>{inProgressTasks} Em Andamento</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{doneTasks} Concluído</span>
            </div>
          </div>
        </div>

        {/* Pure SVG Circular Donut Chart (zero dependencies) */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            {/* Background Track */}
            <path
              className="text-slate-100"
              strokeWidth="3.6"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {/* Completion Progress Stroke */}
            <path
              className="text-indigo-600 transition-all duration-700 ease-out"
              strokeDasharray={`${completionRate}, 100`}
              strokeWidth="3.6"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-sm font-extrabold text-slate-900 leading-none">
              {completionRate}%
            </span>
            <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-tight mt-0.5">
              Taxa
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

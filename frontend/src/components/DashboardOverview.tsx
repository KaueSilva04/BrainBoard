import React from 'react';
import { CheckCircle2, CircleDot, ListTodo, TrendingUp } from 'lucide-react';
import type { Task } from '../types';

interface DashboardOverviewProps {
  tasks: Task[];
  compactMobile?: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ tasks, compactMobile = false }) => {
  const total = tasks.length;
  const todo = tasks.filter((task) => task.status === 'TODO').length;
  const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const done = tasks.filter((task) => task.status === 'DONE').length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const radialRadius = 22;
  const radialCircumference = 2 * Math.PI * radialRadius;
  const radialDashOffset = radialCircumference - (progress / 100) * radialCircumference;

  const metrics = [
    {
      label: 'Total de tarefas',
      value: total,
      detail: `${todo} pendentes`,
      icon: ListTodo,
      tone: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    {
      label: 'Em andamento',
      value: inProgress,
      detail: 'Tarefas em execução',
      icon: CircleDot,
      tone: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Concluídas',
      value: done,
      detail: 'Tarefas finalizadas',
      icon: CheckCircle2,
      tone: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <section
      aria-label="Resumo do projeto"
      className={`grid ${compactMobile ? 'grid-cols-2 gap-2 sm:gap-4' : 'grid-cols-1 gap-4'} sm:grid-cols-2 2xl:grid-cols-4`}
    >
      {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
        <div
          key={label}
          className={`bb-panel flex ${compactMobile ? 'min-h-28 p-3 sm:min-h-36 sm:p-5' : 'min-h-36 p-5'} flex-col justify-between`}
        >
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <p className={`${compactMobile ? 'text-xs sm:text-sm' : 'text-sm'} font-medium text-slate-500 dark:text-slate-400`}>
              {label}
            </p>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${tone}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div>
            <p className={`bb-tabular font-mono ${compactMobile ? 'text-2xl sm:text-[30px]' : 'text-[30px]'} font-bold leading-none tracking-tight text-slate-950 dark:text-slate-100`}>
              {value}
            </p>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-xs">
              {detail}
            </p>
          </div>
        </div>
      ))}

      <div
        className={`bb-panel flex ${compactMobile ? 'min-h-28 p-3 sm:min-h-36 sm:p-5' : 'min-h-36 p-5'} flex-col justify-between`}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <p className={`${compactMobile ? 'text-xs sm:text-sm' : 'text-sm'} font-medium text-slate-500 dark:text-slate-400`}>
            Progresso geral
          </p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 sm:h-9 sm:w-9">
            <TrendingUp className="h-[18px] w-[18px]" />
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <p className={`bb-tabular font-mono ${compactMobile ? 'text-2xl sm:text-[30px]' : 'text-[30px]'} font-bold leading-none tracking-tight text-slate-950 dark:text-slate-100`}>
              {progress}%
            </p>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 sm:mt-2 sm:text-xs">
              <span className="bb-tabular font-mono">{done}</span> de <span className="bb-tabular font-mono">{total}</span>
            </p>
          </div>

          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16"
            role="progressbar"
            aria-label="Progresso geral"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <svg
              className="h-14 w-14 -rotate-90 transform sm:h-16 sm:w-16"
              viewBox="0 0 56 56"
              aria-hidden="true"
            >
              <circle
                cx="28"
                cy="28"
                r={radialRadius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="5"
                className="text-slate-200 dark:text-slate-800"
              />
              <circle
                cx="28"
                cy="28"
                r={radialRadius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={radialCircumference}
                strokeDashoffset={radialDashOffset}
                strokeLinecap="round"
                className="text-indigo-600 transition-all duration-500 dark:text-indigo-400 motion-reduce:transition-none"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bb-tabular font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300 sm:text-xs">
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

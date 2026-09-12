import React, { useState } from 'react';
import { Check, Trash2, Loader2 } from 'lucide-react';
import { Subtask } from '../types/task';

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (id: string, isDone: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const SubtaskItem: React.FC<SubtaskItemProps> = ({
  subtask,
  onToggle,
  onDelete,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onToggle(subtask.id, !subtask.isDone);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || isUpdating) return;
    setIsUpdating(true);
    try {
      await onDelete(subtask.id);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={`group flex items-center justify-between gap-2.5 p-2 px-2.5 rounded-xl transition-all cursor-pointer text-xs border ${
        subtask.isDone
          ? 'bg-slate-50/60 border-slate-200/50 text-slate-400 hover:bg-slate-100/60'
          : 'bg-white border-slate-200/70 text-slate-700 hover:border-indigo-200 hover:bg-slate-50/50 shadow-xs'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Custom Rounded Checkbox */}
        <button
          type="button"
          aria-label={subtask.isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
          className={`shrink-0 w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
            subtask.isDone
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
              : 'border-slate-300 group-hover:border-indigo-400 bg-white'
          }`}
        >
          {isUpdating ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" />
          ) : subtask.isDone ? (
            <Check className="w-3 h-3 stroke-[3]" />
          ) : null}
        </button>

        {/* Subtask Title */}
        <span
          className={`truncate transition-all ${
            subtask.isDone ? 'line-through text-slate-400 font-normal' : 'text-slate-700 font-medium'
          }`}
        >
          {subtask.title}
        </span>
      </div>

      {/* Delete button (visible on hover) */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Excluir subtarefa"
          className="opacity-0 group-hover:opacity-100 hover:text-rose-500 text-slate-400 p-1 rounded-md transition-all hover:bg-rose-50"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

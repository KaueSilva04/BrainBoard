import React from 'react';

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarStackMember {
  id: string;
  name: string;
  avatarColor?: string | null;
  role?: string;
}

interface AvatarStackProps {
  collaborators?: AvatarStackMember[];
  maxVisible?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  collaborators = [],
  maxVisible,
  max = 3,
  size = 'sm',
}) => {
  const limit = maxVisible ?? max;
  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  const visible = collaborators.slice(0, limit);
  const remaining = collaborators.length - limit;

  const sizeClass = size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-xs';

  return (
    <div className="flex items-center -space-x-1.5 overflow-hidden">
      {visible.map((c) => (
        <div
          key={c.id}
          className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white dark:ring-slate-900`}
          style={{ backgroundColor: c.avatarColor || '#334155' }}
          title={`${c.name}${c.role === 'OWNER' ? ' (Proprietário)' : ''}`}
        >
          {getInitials(c.name)}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-slate-200 font-mono text-[9px] font-bold text-slate-700 ring-2 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900 bb-tabular`}
          title={`${remaining} outros membros`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
};

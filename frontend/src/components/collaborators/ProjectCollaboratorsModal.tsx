import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, UserPlus, UserMinus, Loader2, Shield, Users, AlertCircle } from 'lucide-react';
import { useAccessibleModal } from '../../hooks/useAccessibleModal';
import { collaboratorsApi, usersApi } from '../../services/api';
import type { ProjectCollaborator, AuthUser } from '../../types';
import { getInitials } from './AvatarStack';

interface ProjectCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  currentUserId?: string;
  onCollaboratorsUpdated?: () => void;
}

export const ProjectCollaboratorsModal: React.FC<ProjectCollaboratorsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  currentUserId,
  onCollaboratorsUpdated,
}) => {
  const dialogRef = useAccessibleModal<HTMLDivElement>(isOpen, onClose);

  const [collaborators, setCollaborators] = useState<ProjectCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AuthUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const loadCollaborators = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await collaboratorsApi.list(projectId);
      setCollaborators(data);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a lista de colaboradores.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      void loadCollaborators();
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen, loadCollaborators]);

  // Debounced search for users
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await usersApi.search(trimmed, 8);
        // Filter out users that are already members
        const currentMemberIds = new Set(collaborators.map((c) => c.userId));
        setSearchResults(results.filter((u) => !currentMemberIds.has(u.id)));
      } catch {
        // Silently ignore search error
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, collaborators]);

  const handleInvite = async (user: AuthUser) => {
    setInvitingUserId(user.id);
    setError(null);
    try {
      await collaboratorsApi.add(projectId, { userId: user.id });
      await loadCollaborators();
      setSearchResults((prev) => prev.filter((u) => u.id !== user.id));
      onCollaboratorsUpdated?.();
    } catch (err: any) {
      setError(err?.message || `Não foi possível convidar ${user.name}.`);
    } finally {
      setInvitingUserId(null);
    }
  };

  const handleRemove = async (collab: ProjectCollaborator) => {
    if (collab.isOwner || collab.role === 'OWNER') return;

    const confirmed = window.confirm(
      `Deseja remover ${collab.name} do projeto? Suas tarefas continuarão salvas no projeto.`
    );
    if (!confirmed) return;

    setRemovingUserId(collab.userId);
    setError(null);
    try {
      await collaboratorsApi.remove(projectId, collab.userId);
      await loadCollaborators();
      onCollaboratorsUpdated?.();
    } catch (err: any) {
      setError(err?.message || `Não foi possível remover ${collab.name}.`);
    } finally {
      setRemovingUserId(null);
    }
  };

  if (!isOpen) return null;

  const isOwnerOfProject = collaborators.some(
    (c) => c.userId === currentUserId && (c.isOwner || c.role === 'OWNER')
  );

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collaborators-modal-title"
        className="bb-panel relative flex w-full max-w-lg flex-col overflow-hidden bg-white shadow-xl dark:bg-slate-900"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="collaborators-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Colaboradores do projeto
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-xs">
                {projectTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Search / Invite Section */}
          <div className="space-y-2">
            <label
              htmlFor="user-search-input"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Convidar colaborador
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                id="user-search-input"
                type="search"
                data-modal-autofocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar usuário por nome ou email..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-100 dark:focus:bg-slate-900"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
              )}
            </div>

            {/* Live Search Results */}
            {searchResults.length > 0 && (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-800/80">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: user.avatarColor || '#334155' }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {user.name}
                        </p>
                        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={invitingUserId === user.id}
                      onClick={() => handleInvite(user)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                    >
                      {invitingUserId === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      <span>Convidar</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Members List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Membros do projeto</span>
              <span className="bb-tabular font-mono text-[11px] font-semibold text-slate-400">
                {collaborators.length}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-12 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : collaborators.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhum colaborador encontrado.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/50">
                {collaborators.map((collab) => {
                  const isOwner = collab.isOwner || collab.role === 'OWNER';
                  return (
                    <div
                      key={collab.userId}
                      className="flex items-center justify-between gap-3 px-3.5 py-3 text-xs"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ring-1 ring-black/10 dark:ring-white/10"
                          style={{ backgroundColor: collab.avatarColor || '#334155' }}
                        >
                          {getInitials(collab.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">
                            {collab.name}
                          </p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {collab.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Shield className="h-2.5 w-2.5" />
                            Proprietário
                          </span>
                        ) : (
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            Colaborador
                          </span>
                        )}

                        {!isOwner && isOwnerOfProject && (
                          <button
                            type="button"
                            disabled={removingUserId === collab.userId}
                            onClick={() => handleRemove(collab)}
                            aria-label={`Remover ${collab.name} do projeto`}
                            title="Remover colaborador"
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                          >
                            {removingUserId === collab.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <UserMinus className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

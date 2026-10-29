import React, { useEffect, useState } from 'react';
import { KeyRound, X, Copy, Check, Loader2 } from 'lucide-react';
import { useAccessibleModal } from '../hooks/useAccessibleModal';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface McpTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const McpTokenModal: React.FC<McpTokenModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [token, setToken] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<string>('365d');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const dialogRef = useAccessibleModal<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    authApi
      .mcpToken()
      .then((res) => {
        setToken(res.token);
        setExpiresIn(res.expiresIn || '365d');
      })
      .catch(() => {
        const stored =
          localStorage.getItem('brainboard_token') ||
          localStorage.getItem('brainboard_auth_token') ||
          '';
        setToken(stored);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const baseUrl = (
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/$/, '');

  const streamableUrl = token ? `${baseUrl}/mcp?token=${token}` : `${baseUrl}/mcp`;
  const sseUrl = `${baseUrl}/mcp/sse`;

  const copyToClipboard = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  return (
    <div
      className="bb-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcp-modal-title"
        tabIndex={-1}
        className="bb-dialog-panel relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <KeyRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 id="mcp-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Token & Conexão MCP (Model Context Protocol)
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Integração para Codex, Claude Desktop, Cursor e outros agentes de IA. Validade:{' '}
                <strong className="text-slate-700 dark:text-slate-300 font-semibold">{expiresIn}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Streamable HTTP URL */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                URL Streamable HTTP (Codex / Antigravity / Modern)
              </span>
              <button
                type="button"
                disabled={loading || !token}
                onClick={() => copyToClipboard(streamableUrl, 'streamable')}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-slate-900 px-2.5 font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {copiedKey === 'streamable' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedKey === 'streamable' ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <code className="block break-all rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              {loading ? 'Obtendo token...' : streamableUrl}
            </code>
          </div>

          {/* SSE URL */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                URL SSE (Claude Desktop / Legacy)
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => copyToClipboard(sseUrl, 'sse')}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {copiedKey === 'sse' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedKey === 'sse' ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <code className="block break-all rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              {sseUrl}
            </code>
          </div>

          {/* Bearer Token */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Token Bearer ({user?.email ?? 'Usuário'})
              </span>
              <button
                type="button"
                disabled={loading || !token}
                onClick={() => copyToClipboard(token, 'token')}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {copiedKey === 'token' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedKey === 'token' ? 'Copiado!' : 'Copiar Token'}</span>
              </button>
            </div>
            <code className="block max-h-20 overflow-y-auto break-all rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {loading ? (
                <span className="flex items-center gap-1 text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando...
                </span>
              ) : (
                token || 'Nenhum token disponível'
              )}
            </code>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

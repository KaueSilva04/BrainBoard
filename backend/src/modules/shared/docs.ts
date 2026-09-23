import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';

export const serveDocumentation = (req: Request, res: Response) => {
  const format = ((req.query.format as string) || '').toLowerCase();
  const accept = (req.headers.accept || '').toLowerCase();

  const docPaths = [
    path.resolve(process.cwd(), 'MCP_DOCUMENTATION.md'),
    path.resolve(process.cwd(), '..', 'MCP_DOCUMENTATION.md'),
    path.resolve(process.cwd(), 'backend', '..', 'MCP_DOCUMENTATION.md'),
  ];
  let markdownContent = '';
  for (const p of docPaths) {
    if (fs.existsSync(p)) {
      markdownContent = fs.readFileSync(p, 'utf-8');
      break;
    }
  }

  // 1. Formato Markdown bruto (para curl, CLIs e IAs em modo raw)
  if (format === 'md' || format === 'raw' || accept === 'text/markdown') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send(markdownContent || '# BrainBoard MCP Documentation');
  }

  // 2. Formato JSON (para ferramentas automatizadas e IAs consumindo JSON)
  if (format === 'json' || accept.includes('application/json')) {
    return res.json({
      name: 'BrainBoard MCP Server',
      version: '2.1.0',
      status: 'online',
      protocol: 'Model Context Protocol (MCP) / JSON-RPC 2.0',
      transports: {
        streamableHttp: {
          url: '/mcp',
          description: 'Transporte moderno para Codex, Claude Code e novos agentes (POST /mcp)',
          format: 'JSON-RPC 2.0 via HTTP com suporte a mcp-session-id',
        },
        sseLegacy: {
          url: '/mcp/sse',
          messagesUrl: '/mcp/messages?sessionId={uuid}',
          description: 'Transporte SSE legado para clientes baseados em streaming clássico',
        },
        rest: {
          url: '/api',
          description: 'API REST tradicional para frontend e operações diretas via cURL',
        },
      },
      toolsCount: 18,
      tools: [
        { name: 'read_project_context', description: 'Lê o contexto completo do projeto (regras, repositório, etapas, tarefas, subtarefas, membros e logs)', args: ['projectId'] },
        { name: 'update_business_logic', description: 'Atualiza a especificação de regras de negócio em Markdown', args: ['projectId', 'businessLogic'] },
        { name: 'update_project_settings', description: 'Atualiza repositório GitHub e configurações JSON dinâmicas', args: ['projectId', 'githubRepo?', 'settings?', 'businessLogic?'] },
        { name: 'log_project_update', description: 'Gera uma entrada no Diário de Bordo do projeto com data e autor', args: ['projectId', 'title', 'content', 'author?'] },
        { name: 'create_task', description: 'Cria uma nova tarefa vinculada a uma etapa (stage)', args: ['stageId', 'title', 'description?', 'status?'] },
        { name: 'add_task', description: 'Alias para create_task', args: ['stageId', 'title', 'description?', 'status?'] },
        { name: 'move_task', description: 'Altera status da tarefa (TODO, IN_PROGRESS, DONE) ou move de etapa', args: ['id', 'status', 'stageId?'] },
        { name: 'update_task_status', description: 'Alias para move_task', args: ['id', 'status', 'stageId?'] },
        { name: 'update_task', description: 'Atualiza título, descrição, status ou etapa de uma tarefa', args: ['id', 'title?', 'description?', 'status?', 'stageId?'] },
        { name: 'delete_task', description: 'Exclui uma tarefa e suas subtarefas em cascata', args: ['id'] },
        { name: 'list_tasks', description: 'Lista tarefas com filtros opcionais de etapa ou status', args: ['stageId?', 'status?'] },
        { name: 'get_task', description: 'Busca detalhes de uma tarefa específica e suas subtarefas', args: ['id'] },
        { name: 'add_subtask', description: 'Adiciona um item ao checklist da tarefa', args: ['taskId', 'title'] },
        { name: 'toggle_subtask', description: 'Marca ou desmarca um item do checklist (inverte status se isDone for omitido)', args: ['id', 'isDone?'] },
        { name: 'delete_subtask', description: 'Exclui um item específico de subtarefa', args: ['id'] },
        { name: 'create_appointment', description: 'Cria um novo compromisso com horário no calendário', args: ['title', 'startTime', 'endTime', 'description?', 'locationOrLink?'] },
        { name: 'list_upcoming_deadlines', description: 'Consulta prazos, entregas de projetos e compromissos futuros', args: ['days?', 'projectId?', 'includeCompleted?'] },
        { name: 'add_to_sprint', description: 'Adiciona ou remove uma tarefa da Sprint ativa semanal', args: ['taskId', 'isSprintActive?'] },
      ],
      quickstart: {
        codexToml: '[mcp_servers.brainboard]\nurl = "http://localhost:3000/mcp"',
        claudeDesktopJson: '{\n  "mcpServers": {\n    "brainboard": {\n      "command": "npx",\n      "args": ["-y", "mcp-remote", "http://localhost:3000/mcp/sse"]\n    }\n  }\n}',
      },
    });
  }

  // 3. Formato HTML Moderno (Página de documentação interativa para o navegador)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BrainBoard MCP — Documentação Oficial</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F8FAFC; }
    pre { background: #0F172A; color: #F8FAFC; }
  </style>
</head>
<body class="text-slate-800 antialiased p-4 sm:p-8 md:p-12">
  <div class="max-w-5xl mx-auto space-y-8">
    <header class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-500/20">
          🧠
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">BrainBoard MCP Server</h1>
          <p class="text-xs sm:text-sm text-slate-500 font-medium">Documentação Técnica, Endpoints e Ferramentas para Agentes de IA</p>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Online v2.1 (Modular Monolith)
        </span>
        <a href="/api/docs?format=json" class="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
          JSON API
        </a>
        <a href="/api/docs?format=raw" class="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
          Markdown
        </a>
      </div>
    </header>

    <section class="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
      <div class="flex items-center justify-between mb-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Configuração Rápida</span>
          <h2 class="text-xl font-bold mt-0.5">Conectar no Codex (Terminal)</h2>
        </div>
        <span class="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2.5 py-1 rounded-lg font-mono">Streamable HTTP</span>
      </div>
      <p class="text-sm text-slate-300 mb-4">Cole no seu arquivo de configuração do Codex (<code>config.toml</code>) para ativar as 18 ferramentas instantaneamente:</p>
      <div class="relative">
        <pre class="p-4 rounded-2xl text-xs sm:text-sm font-mono overflow-x-auto border border-slate-700/60"><code>[mcp_servers.brainboard]
url = "http://localhost:3000/mcp"</code></pre>
      </div>
    </section>

    <section class="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
      <h2 class="text-lg font-bold text-slate-900">Endpoints Ativos do Servidor</h2>
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700">POST / ALL</span>
            <span class="text-xs font-bold text-slate-900 font-mono">/mcp</span>
          </div>
          <p class="text-xs text-slate-600">Streamable HTTP moderno com sessões automáticas (Codex, Claude Code).</p>
        </div>
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">GET / SSE</span>
            <span class="text-xs font-bold text-slate-900 font-mono">/mcp/sse</span>
          </div>
          <p class="text-xs text-slate-600">Transporte Server-Sent Events legado para clientes tradicionais.</p>
        </div>
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700">REST API</span>
            <span class="text-xs font-bold text-slate-900 font-mono">/api</span>
          </div>
          <p class="text-xs text-slate-600">API REST direta para frontend e comandos cURL.</p>
        </div>
      </div>
    </section>

    <footer class="text-center text-xs text-slate-400 py-4">
      BrainBoard v2.1 • FocusTask MCP Protocol Server • Servido localmente em http://localhost:3000
    </footer>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
};

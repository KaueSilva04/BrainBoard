# Original User Request

## Initial Request — 2026-09-11T00:27:03Z

Implement the remaining milestones (M1 Backend, M2 Frontend, M3 Dockerization) for FocusTask, a personal Kanban board with AI MCP support via SSE, React frontend, Node.js+Prisma backend.

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Requirements

### R1. Backend Completion (M1)
Implement missing MCP tools (`add_subtask`, `toggle_subtask`) in `backend/src/index.ts` and missing REST routes for full CRUD of tasks and subtasks as expected by the frontend and MCP clients.

### R2. Frontend Construction (M2)
Create the React 18 frontend with Vite and TailwindCSS, including `KanbanBoard.tsx`, `TaskCard.tsx`, and `CreateTaskModal.tsx`, integrating with the backend API.

### R3. Dockerization (M3)
Create `Dockerfile`s for both frontend and backend, update `docker-compose.yml` to orchestrate them alongside Neon DB, and set up Nginx for the frontend.

## Verification Resources
An E2E test suite already exists at `tests/e2e_test_runner.ts` which asserts the complete system functionality.

## Acceptance Criteria

### Test Pass Rate
- [ ] All Tier 1, Tier 2, Tier 3, and Tier 4 tests pass with 0 failures when running `npx tsx tests/e2e_test_runner.ts` and `npx tsx tests/e2e_test_runner.ts --live`.

## Follow-up — 2026-09-11T00:35:25Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Finalizar o desenvolvimento do FocusTask (Kanban board com integração MCP) e melhorar sua arquitetura, analisando a base de código atual para implementar tudo o que falta para deixar o sistema totalmente pronto para uso.

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Requirements

### R1. Análise e Conclusão de Funcionalidades
Analisar a base de código existente (frontend React, backend Node.js, Prisma, e ferramentas MCP) e implementar qualquer funcionalidade faltante ou incompleta necessária para tornar o sistema plenamente utilizável. O sistema deve atender plenamente à proposta original.

### R2. Melhoria da Arquitetura e Robustez
Revisar e aprimorar a arquitetura do sistema para torná-lo mais robusto e pronto para produção, garantindo boas práticas de organização de código e integração segura do transporte MCP.

### R3. Preparação para Deploy
Garantir que a orquestração via Docker (Dockerfile para frontend/backend, docker-compose.yml e Nginx) esteja 100% configurada e funcional para um deploy estável.

## Acceptance Criteria

### Verificação de Qualidade e Funcionalidade
- [ ] Todos os testes E2E atuais (`tests/e2e_test_runner.ts`) devem continuar passando com 100% de sucesso.
- [ ] Nenhuma funcionalidade chave do Kanban (CRUD de tarefas, subtarefas, movimentação, filtros) deve apresentar erros.
- [ ] A arquitetura deve refletir boas práticas (ex: separação de responsabilidades no backend) verificáveis de forma programática.


## Follow-up — 2026-09-11T17:20:46Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

We are implementing Milestone 1 (M1) of the FocusTask Personal Kanban System. The goal is to complete the backend by implementing missing REST API endpoints, missing MCP Server-Sent Events (SSE) tools, and fixing the TypeScript build configuration.

Working directory: C:\Users\Kaue\Desktop\BrainBoard
Integrity mode: development

## Requirements

### R1. Implement Missing MCP Tools
Implement the missing MCP tools `add_subtask` and `toggle_subtask`, registering them correctly in `backend/src/index.ts`. Ensure they follow the existing JSON-RPC over SSE patterns.

### R2. Implement Missing REST Routes
Implement the missing REST API routes in `backend/src/index.ts`:
- `POST /api/tasks` (task creation)
- `PATCH /api/tasks/:id` (status/field update)
- `DELETE /api/tasks/:id` (task deletion)
- `POST /api/tasks/:id/subtasks` (subtask creation)
- `PATCH /api/subtasks/:id` (subtask toggle)
- `DELETE /api/subtasks/:id` (subtask deletion)

### R3. Fix TypeScript Build
Update `tsconfig.json` to properly configure `outDir: ./dist` and ensure the project builds successfully for production execution without type errors blocking it.

## Verification Resources
- The project has an automated E2E test runner at `tests/e2e_test_runner.ts`.
- Run `npx tsx tests/e2e_test_runner.ts --tier=1` to verify Milestone 1.

## Acceptance Criteria

### Functionality & Tests
- [ ] Running `npx tsx tests/e2e_test_runner.ts --tier=1` passes with 0 failures.
- [ ] `backend/src/index.ts` continues to preserve the exact token strings required by the static contract tests (e.g. tool names, route signatures).
- [ ] The backend compiles successfully using `tsc`.

## Follow-up — 2026-09-12T16:25:37Z

Redesenhar completamente o frontend React do **FocusTask** (Kanban pessoal com IA/MCP) para ter um design de dashboard moderno, clean e profissional inspirado na imagem de referência da pasta `anexos/`, preservando toda a funcionalidade existente e garantindo que todos os 37 testes E2E continuem passando.

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Contexto do Projeto

O FocusTask é um sistema Kanban pessoal com:
- **Backend**: Node.js + TypeScript + Prisma ORM + Neon PostgreSQL
- **Frontend**: React 18 + Vite + TailwindCSS (atualmente tema dark/slate)
- **MCP**: Servidor MCP com SSE para integração com IA
- **Stack já funcional**: 37/37 testes E2E passando (Tier 1-4)

### Estado atual do Frontend
O frontend funciona mas usa tema escuro minimalista (slate-950). Os componentes existentes são:
- `App.tsx` — gerenciamento de estado global
- `Navbar.tsx` — barra de navegação com filtros de categoria
- `KanbanBoard.tsx` — layout das 3 colunas (TODO, IN_PROGRESS, DONE)
- `KanbanColumn.tsx` — coluna individual
- `TaskCard.tsx` — card de tarefa com subtarefas
- `CreateTaskModal.tsx` — modal de criação de tarefa
- `SubtaskItem.tsx` — item de subtarefa

### Design de Referência
A pasta `C:/Users/Kaue/Desktop/BrainBoard/anexos/f5d287153435761.632fc9cf413b4.png` contém a imagem de referência do design desejado — um dashboard M.project com:
- **Fundo geral**: cinza claro suave (`#F0F2F5` aprox.)
- **Cards/Panels**: branco puro com bordas arredondadas e sombra suave
- **Sidebar lateral** com ícones de navegação (Dashboard, Project, Calendar, Profile, Statistic, Message, Setting, Notification) e logo no topo
- **Tipografia**: dark navy/azul escuro para títulos, cinza médio para subtextos
- **Accent colors**: roxo/violeta para botões primários, verde/teal para status positivo, rosa/vermelho para negativo
- **Cards de projeto**: com barra de progresso colorida (gradient), avatares de membros, ícone colorido, badges
- **Sem fundo escuro** — design light, clean, corporativo

## Requirements

### R1. Redesign Visual Completo (Light Theme)
Substituir o tema dark atual por um design light moderno inspirado na referência, incluindo:
- Sidebar de navegação lateral com ícones e labels
- Fundo geral em cinza claro suave
- Cards em branco com sombra suave e bordas arredondadas
- Paleta de cores: navy/violeta para primário, verde para sucesso, vermelho para erro/alerta
- Tipografia clara com hierarquia visual definida
- Header/top bar com busca e perfil do usuário

### R2. Dashboard Overview com Métricas
Adicionar uma seção de overview/dashboard no topo do Kanban com:
- Cards de métricas: total de tarefas, tarefas em andamento, tarefas concluídas, taxa de progresso geral
- Barra de progresso visual para o progresso geral (como o donut/ring chart na referência — pode ser uma barra ou ring simples com CSS/SVG puro, sem libs externas)
- Os dados devem ser calculados em tempo real a partir das tarefas existentes

### R3. Kanban Cards Redesenhados
Redesenhar os cards de tarefa para o estilo da referência:
- Ícone colorido por categoria (caixas coloridas como na referência)
- Barra de progresso de subtarefas com gradient colorido (não apenas uma barra cinza)
- Badge de categoria com cor vibrante
- Exibir data no formato "X dias restantes" ou data de criação
- Botões de ação mais visíveis e estilizados

### R4. Manutenção da Funcionalidade Completa
Toda a lógica de negócio deve ser preservada:
- CRUD de tarefas e subtarefas
- Filtros por categoria (Todas, Projetos, Faculdade, Pessoais)
- Movimentação entre colunas (TODO → IN_PROGRESS → DONE)
- Modal de criação de tarefas
- Integração com API backend

## Acceptance Criteria

### Verificação Visual e Funcional
- [ ] Executar `npx tsx tests/e2e_test_runner.ts` na pasta `C:/Users/Kaue/Desktop/BrainBoard` e obter **37/37 testes PASSANDO** (0 falhas) — todos os contratos de componentes React devem ser mantidos.
- [ ] O frontend deve fazer build sem erros com `npm run build` dentro de `C:/Users/Kaue/Desktop/BrainBoard/frontend`.
- [ ] O design usa tema light (fundo claro, cards brancos) — não dark — verificável inspecionando as classes Tailwind no código (nenhuma ocorrência dominante de `bg-slate-900` ou `bg-slate-950` nas classes raiz do layout).
- [ ] A sidebar lateral de navegação existe no componente `Navbar.tsx` ou equivalente.
- [ ] Os cards de tarefa exibem barra de progresso de subtarefas com gradient colorido.
- [ ] Existe seção de overview/métricas com pelo menos 3 cards de estatísticas (total, em andamento, concluídas).

### Verificação de Integridade de Contrato
- [ ] Os contratos de componente que o test runner verifica devem ser mantidos: `KanbanBoard`, `TaskCard`, `CreateTaskModal`, filtros de categoria `'A Fazer'`, `'Em Andamento'`, `'Concluído'`, labels de categoria `'Projetos'`/`'Faculdade'`/`'Pessoais'`.

## Follow-up — 2026-09-12T17:15:47Z

**Instrução de Versionamento Git — IMPORTANTE**

O repositório git já está inicializado em `C:/Users/Kaue/Desktop/BrainBoard` com o primeiro commit base feito. A partir de agora, **faça commits por funcionalidade** ao longo da implementação.

Pontos obrigatórios de commit (execute `git add -A` e `git commit -m "..."` após cada entrega):

1. `feat(frontend): light theme base — index.css, tailwind config e paleta de cores`
2. `feat(frontend): sidebar navigation — Navbar.tsx convertida em sidebar lateral`
3. `feat(frontend): top header — TopHeader.tsx com busca e perfil`
4. `feat(frontend): dashboard overview — DashboardOverview.tsx com métricas e ring chart`
5. `feat(frontend): kanban columns light theme — KanbanBoard.tsx e KanbanColumn.tsx`
6. `feat(frontend): task card redesign — TaskCard.tsx com ícones coloridos e barra de progresso gradient`
7. `feat(frontend): subtask item redesign — SubtaskItem.tsx tema light`
8. `feat(frontend): create task modal light theme — CreateTaskModal.tsx`
9. `feat(frontend): App.tsx orquestração do novo layout completo`
10. `test: 37/37 E2E tests passing — redesign completo e validado`

**Configuração git já feita** (user.name e user.email configurados). Basta rodar os comandos git diretamente no diretório `C:/Users/Kaue/Desktop/BrainBoard`.

Use `git add -A` antes de cada commit para capturar todas as mudanças do ponto.



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

## Follow-up — 2026-09-12T17:46:10Z

Migrar a arquitetura do backend do FocusTask (antigo Kanban de Tarefas) para o **BrainBoard V2**, um sistema focado em Projetos, Etapas (Milestones) e Diários de Bordo (Update Logs), garantindo a integração contínua do MCP e a reescrita da suíte de testes E2E.

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Requirements

### R1. Refatoração do Schema do Banco de Dados (Prisma)
Substituir o modelo antigo por uma nova hierarquia de Projetos. Atualize o `backend/prisma/schema.prisma` para incluir:
- **Project**: `id`, `title`, `description`, `businessLogic` (Text), `status` (Enum: PLANNING, ACTIVE, COMPLETED), timestamps.
- **UpdateLog**: `id`, `title`, `content` (Text), `author`, `projectId` (relação cascade).
- **Stage (Etapas)**: `id`, `title`, `order`, `status` (Enum), `projectId` (relação cascade).
- **Member**: `id`, `name`, `role`, `projectId` (relação cascade).
- **Task & Subtask**: Atualize a `Task` para pertencer a um `Stage` (remover o enum antigo `Category`). A relação deve ser `Project -> Stage -> Task -> Subtask`.

Gere a migration e atualize o Prisma Client (`npx prisma migrate dev --name init_v2` ou `npx prisma db push`).

### R2. Atualização dos Serviços e REST API
Atualize o código em `backend/src/` (incluindo `index.ts` e serviços) para suportar a nova estrutura:
- Adicione rotas REST completas para criar/listar Projetos, Stages e UpdateLogs.
- Adapte as rotas de Tasks para o novo formato (pertencendo a um Stage).

### R3. Superpoderes de IA (Novas MCP Tools)
O servidor MCP em `backend/src/index.ts` deve registrar novas ferramentas vitais para a IA:
- `read_project_context`: Recebe `projectId` e retorna a Lógica de Negócio, Etapas e últimos logs de atualização.
- `update_business_logic`: Atualiza o campo `businessLogic` de um projeto.
- `log_project_update`: Cria um `UpdateLog` com `title`, `content` (Markdown complexo) e `author`.
- Adapte as ferramentas antigas de task para exigir `stageId`.

### R4. Reescrita Completa dos Testes E2E
A suíte atual de testes (`tests/e2e_test_runner.ts`) falhará catastroficamente pois está amarrada ao modelo antigo. Você deve **reescrever completamente o E2E Test Runner** e os `test_cases.json` (se houver) para validar a nova arquitetura (ex: Criar projeto -> Adicionar Stage -> Escrever Business Logic -> Adicionar Log de Atualização).

## Acceptance Criteria

### Testes e Validação
- [ ] O comando `npx prisma db push` (ou migrate) deve rodar sem erros.
- [ ] O backend compila sem erros (`npm run build` na pasta backend).
- [ ] O novo `tests/e2e_test_runner.ts` passa com 100% de sucesso, validando a criação de projetos, leitura de contexto via MCP e adição de update logs via MCP.
- [ ] Os logs do MCP expõem corretamente as ferramentas `read_project_context`, `update_business_logic` e `log_project_update`.

## Follow-up — 2026-09-12T17:50:32Z

**URGENTE: Nova Regra de Negócio (Requisito Adicional)**

O usuário solicitou uma expansão no modelo de dados antes da criação das tabelas. Atualize o planejamento do `schema.prisma` com o seguinte:

1. **Configurações do Projeto**: O modelo `Project` deve ter campos para configurações técnicas, como:
   - `githubRepo` (String opcional)
   - `settings` (JSON - para armazenar configurações dinâmicas que o agente ou usuário definam no futuro, ex: URLs de deploy, stack, chaves, etc).
2. **Membros Mais Completos**: O modelo `Member` deve incluir um campo `email` (String opcional) além do nome e cargo.
3. **MCP Tools**: Certifique-se de que a ferramenta `update_business_logic` (ou uma nova `update_project_settings`) permita à IA preencher o repositório Github e configurações JSON.

Incorpore isso na Fase 1 (Modelagem) antes de executar a migração.

## Follow-up — 2026-09-14T15:13:39Z

The BrainBoard project (a fullstack Kanban + MCP server in Node.js/Express/Prisma + React/Vite) has passed 41/41 offline E2E tests. The next milestone is to run the full live test suite (`--live` flag) against the real backend connected to the Neon PostgreSQL database, identify any failures, fix them, and achieve 100% pass rate on both offline and live modes.

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Requirements

### R1. Backend Running & Live E2E Passing
Start the backend (via `npm run dev` in `./backend`) and run `npx tsx tests/e2e_test_runner.ts --live` from the project root. All 41 tests must pass in live mode, including real HTTP requests and MCP SSE connections to the backend on `http://localhost:3000`.

### R2. Fix Any Live Failures
If any tests fail in live mode, identify the root cause (missing route, validation bug, schema mismatch, runtime error) and implement the minimal fix in the backend source code. Re-run the live suite after each fix cycle until 0 failures remain.

### R3. No Regressions
After all fixes, run the offline suite (`npx tsx tests/e2e_test_runner.ts`) one final time to confirm the 41/41 offline baseline is still intact. Both modes must pass simultaneously.

## Acceptance Criteria

### Live Test Suite
- [ ] `npx tsx tests/e2e_test_runner.ts --live` exits with code 0
- [ ] All 41 tests pass (41/41, 100%) in live mode
- [ ] Tier 1, Tier 2, Tier 3, and Tier 4 all report 100% individually

### Offline Regression Guard
- [ ] `npx tsx tests/e2e_test_runner.ts` (no --live flag) still passes 41/41 after any changes

### No Side Effects
- [ ] No existing source files were deleted or restructured beyond what was needed to fix test failures
- [ ] The Prisma schema remains valid (`npx prisma validate` passes in `./backend`)

## Verification Resources
- **Test runner**: `tests/e2e_test_runner.ts` — supports `--live`, `--tier=N`, and offline mode
- **Offline baseline**: 41/41 already passing (confirmed in current session)
- **Backend entry**: `backend/src/index.ts` (1346 lines, all routes + MCP server)
- **Prisma schema**: `backend/prisma/schema.prisma`
- **Backend env**: `backend/.env` with `DATABASE_URL` pointing to Neon.tech

## Follow-up — 2026-09-14T15:51:42Z

The BrainBoard project frontend (React 18 + Vite + TypeScript + Tailwind CSS) is showing a white screen because `frontend/src/App.tsx` still uses the old category-based model (importing `{ api }` from `./services/api` and types from `./types/task`) while the rest of the frontend was already updated to the V2 model (Project → Stage → Task hierarchy).

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Context

The backend (Node.js + Express + Prisma) is fully functional with this V2 REST API:
- `GET/POST /api/projects` — list and create projects
- `GET/PATCH/DELETE /api/projects/:id` — project detail, update, delete
- `GET/POST /api/projects/:projectId/stages` — list and create stages
- `PATCH/DELETE /api/stages/:id` — update or delete a stage
- `GET/POST /api/stages/:stageId/tasks` — list and create tasks
- `PATCH/DELETE /api/tasks/:id` — update or delete a task
- `POST /api/tasks/:id/subtasks` — add subtask
- `PATCH/DELETE /api/subtasks/:id` — toggle/delete subtask
- `GET/POST /api/projects/:projectId/members` — members
- `GET/POST /api/projects/:projectId/update-logs` — update logs

The frontend already has correct V2 types in `frontend/src/types/index.ts` and correct V2 API client in `frontend/src/services/api.ts` (exports: `projectsApi`, `stagesApi`, `tasksApi`, `membersApi`, `updateLogsApi`).

The problem is `frontend/src/App.tsx` (and some components) are stuck on the old model:
- `App.tsx` imports `{ api }` (does not exist anymore) from `./services/api` → **white screen crash**
- `App.tsx` uses `Category`, `CategoryFilter`, `CreateTaskInput` from `./types/task` (old file)
- Components like `Navbar`, `TopHeader`, `KanbanBoard`, `KanbanColumn`, `TaskCard`, `CreateTaskModal`, `DashboardOverview`, `ProjectCard` were built for the old flat-task model

The TypeScript compiler confirms: `src/App.tsx(2,10): error TS2305: Module '"./services/api"' has no exported member 'api'`

## Requirements

### R1. Fix White Screen — Rebuild App.tsx for V2
Rewrite `frontend/src/App.tsx` to use the V2 model: list projects from `projectsApi.list()`, allow selecting a project to view its stages and tasks, use `stagesApi`, `tasksApi`, etc. The app must load without crashing.

### R2. Update All Components
Update or rebuild all components in `frontend/src/components/` so they work with the V2 types (`Project`, `Stage`, `Task`, `Subtask` from `frontend/src/types/index.ts`). The UI should show:
- A project list/selector view
- When a project is selected: its stages as columns (Kanban-style), each stage showing tasks with TODO/IN_PROGRESS/DONE status
- Ability to create projects, stages, tasks, and subtasks
- Task cards with subtask checklists

### R3. TypeScript Must Compile Clean
After all changes, `npx tsc --noEmit` run from `frontend/` must exit with code 0 (zero TypeScript errors).

### R4. No Regressions on Backend
The backend E2E test suite must still pass. Run `npx tsx tests/e2e_test_runner.ts` from the project root to verify 41/41 offline tests still pass.

## Acceptance Criteria

### Zero TypeScript Errors
- [ ] `npx tsc --noEmit` in `frontend/` exits with code 0

### App Loads Without Crashing
- [ ] No runtime crash on startup (no white screen)
- [ ] `App.tsx` does NOT import `{ api }` — it uses the V2 api modules
- [ ] `App.tsx` does NOT import from `./types/task` (old file) for core logic

### UI Functionality
- [ ] Project list renders when backend is running
- [ ] Clicking a project shows its stages as Kanban columns
- [ ] Tasks render inside their stage column with correct status
- [ ] Subtask checklist renders on task cards

### Backend Not Broken
- [ ] `npx tsx tests/e2e_test_runner.ts` from project root: 41/41 pass

## Verification Resources
- **Frontend types**: `frontend/src/types/index.ts` (V2 — correct, do not change)
- **Frontend API client**: `frontend/src/services/api.ts` (V2 — correct, do not change)
- **Backend**: running on `http://localhost:3000` (start with `npm run dev` in `./backend` if needed)
- **Current broken file**: `frontend/src/App.tsx` — must be rewritten
- **Components to update**: all files in `frontend/src/components/`
- **Vite dev server**: run with `npm run dev` in `./frontend` (port 5173, proxies `/api` to backend)

## 2026-09-16T11:24:21Z

Refatorar e evoluir o sistema BrainBoard para uma arquitetura de Monolito Modular orientada a domínio (Pragmatic DDD), implementando módulos especializados para Engenharia de Projetos (Sprint Kanban), Gestão Acadêmica (To-Do/Deadlines) e Calendário (Agendamentos com projeção de datas), além de novas ferramentas MCP.

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Verification Resources
- Backend typecheck: `npm --prefix backend run build`
- Frontend build: `npm --prefix frontend run build`
- Prisma validation: `npx prisma validate --schema backend/prisma/schema.prisma`
- E2E Test Suite: `npx tsx tests/e2e_test_runner.ts` (todos os testes de regressão devem passar)

## Requirements

### R1. Evolução da Modelagem de Dados (Prisma Schema)
- Criar a entidade `Appointment` para compromissos com horário de início e término (`id`, `title`, `description`, `startTime`, `endTime`, `locationOrLink`, `isCompleted`, timestamps).
- Estender `Task` com campos opcionais para suporte a prazo (`dueDate: DateTime?`) e alocação na sprint semanal (`isSprintActive: Boolean?`).
- Estender `Project` com tipo de projeto (`type: ProjectType` com valores `SOFTWARE` e `ACADEMIC`, com default `SOFTWARE`).
- Manter total retrocompatibilidade com o banco de dados PostgreSQL existente no Neon sem perda de dados.

### R2. Modularização da Arquitetura do Backend
- Reorganizar a camada de serviço e rotas em módulos independentes sob `backend/src/modules/`:
  - `modules/projects/` (Projetos, Fases/Roadmap e Sprint Kanban)
  - `modules/academic/` (Matérias, Entregas/To-Do e Deadlines)
  - `modules/calendar/` (Agendamentos próprios `Appointment` + rota agregada de projeção de prazos)
  - `modules/mcp/` (Servidor MCP Streamable HTTP e SSE)
- O ponto de entrada principal (`backend/src/index.ts`) deve ser desacoplado e enxuto, orquestrando e montando as rotas dos módulos.

### R3. Especialização de Telas no Frontend
- **Visão Sprint Kanban**: Aba/modo onde são exibidas as tarefas ativas da semana (`isSprintActive`), desacopladas das fases longas.
- **Visão To-Do List Acadêmica**: Para projetos do tipo acadêmico/faculdade, interface focada em lista de afazeres com destaque para data limite e contagem regressiva de entrega.
- **Visão Calendário Real**: Visualização em grade/calendário com compromissos próprios (`Appointment`) e marcadores/bandeiras das datas de entrega e prazos dos projetos.

### R4. Expansão de Ferramentas do Servidor MCP
- Adicionar ferramentas especializadas para o Codex e IAs auxiliares:
  - `create_appointment`: Criar compromissos com data/hora de início e término.
  - `list_upcoming_deadlines`: Consultar entregas e prazos da semana.
  - `add_to_sprint`: Marcar tarefas para a Sprint ativa.

## Acceptance Criteria

### Integridade do Banco e Backend
- [ ] Schema do Prisma é validado sem erros (`npx prisma validate`) e sincronizado com o banco Neon.
- [ ] O backend compila sem erros TypeScript (`npm --prefix backend run build`).
- [ ] Todas as rotas existentes da API continuam funcionando com retrocompatibilidade total.

### Frontend e Usabilidade
- [ ] O frontend compila e empacota sem erros (`npm --prefix frontend run build`).
- [ ] Navegação fluida entre a visão Kanban tradicional/Sprint, visualização acadêmica e visão de calendário.
- [ ] Criação, edição e listagem de `Appointment` funcionam na interface.

### Regressão e Testes
- [ ] A suíte de testes de regressão existente (`tests/e2e_test_runner.ts`) continua executando com sucesso (100% de aprovação).
- [ ] Novos testes automatizados cobrem as operações de `Appointment` e as novas ferramentas MCP.
- [ ] Os serviços Docker sobem normalmente via `docker-compose up -d` com status saudável.

## 2026-09-16T12:03:32Z

Continuar a evolução arquitetural e funcional do BrainBoard (FocusTask), implementando o monolito modular (Pragmatic DDD) no backend, extensões de modelagem no Prisma (Appointment, dueDate, isSprintActive, ProjectType), novas visões no frontend (Sprint Kanban, To-Do Acadêmico, Calendário Real) e ferramentas MCP dedicadas, garantindo 100% de integridade e aprovação nos testes E2E.

Working directory: C:/Users/Kaue/Desktop/BrainBoard
Integrity mode: development

## Verification Resources
- Backend typecheck: `npm --prefix backend run build`
- Frontend build: `npm --prefix frontend run build`
- Prisma validation: `npx prisma validate --schema backend/prisma/schema.prisma`
- E2E Test Suite: `npx tsx tests/e2e_test_runner.ts` (todos os testes de regressão existentes e novos devem passar)

## Requirements

### R1. Evolução da Modelagem de Dados (Prisma Schema)
- Implementar a entidade `Appointment` para compromissos com horário de início e término (`id`, `title`, `description`, `startTime`, `endTime`, `locationOrLink`, `isCompleted`, timestamps).
- Estender `Task` com campos opcionais para suporte a prazo (`dueDate: DateTime?`) e alocação na sprint semanal (`isSprintActive: Boolean?`).
- Estender `Project` com tipo de projeto (`type: ProjectType` com valores `SOFTWARE` e `ACADEMIC`, default `SOFTWARE`).
- Manter total retrocompatibilidade com o banco de dados Neon sem perda de dados (`prisma db push` / migração não destrutiva).

### R2. Modularização da Arquitetura do Backend
- Reorganizar a camada de serviço e rotas em módulos independentes sob `backend/src/modules/`:
  - `modules/projects/` (Projetos, Fases/Roadmap e Sprint Kanban)
  - `modules/academic/` (Matérias, Entregas/To-Do e Deadlines)
  - `modules/calendar/` (Agendamentos próprios `Appointment` + rota agregada de projeção de prazos)
  - `modules/mcp/` (Servidor MCP Streamable HTTP e SSE)
- O ponto de entrada principal (`backend/src/index.ts`) deve ser desacoplado e enxuto, orquestrando e montando as rotas dos módulos, mantendo a compatibilidade de rotas REST e SSE.

### R3. Especialização de Telas no Frontend
- **Visão Sprint Kanban**: Exibir tarefas ativas da semana (`isSprintActive`), desacopladas das fases longas.
- **Visão To-Do List Acadêmica**: Focada em lista de afazeres para projetos do tipo `ACADEMIC` com contagem regressiva e destaque para data limite.
- **Visão Calendário Real**: Visualização em grade/calendário com compromissos próprios (`Appointment`) e marcadores/bandeiras das datas de entrega e prazos dos projetos (mantendo bundle enxuto).

### R4. Expansão de Ferramentas do Servidor MCP
- Adicionar ferramentas especializadas para Codex e IAs auxiliares:
  - `create_appointment`: Criar compromissos com data/hora de início e término.
  - `list_upcoming_deadlines`: Consultar entregas e prazos da semana.
  - `add_to_sprint`: Marcar/desmarcar tarefas na Sprint ativa.

## Acceptance Criteria

### Integridade do Banco e Backend
- [ ] Schema do Prisma é validado sem erros (`npx prisma validate`) e sincronizado com o banco Neon.
- [ ] O backend compila sem erros TypeScript (`npm --prefix backend run build`).
- [ ] Todas as rotas existentes da API continuam funcionando com retrocompatibilidade total.

### Frontend e Usabilidade
- [ ] O frontend compila e empacota sem erros (`npm --prefix frontend run build`).
- [ ] Navegação fluida entre a visão Kanban tradicional/Sprint, visualização acadêmica e visão de calendário.
- [ ] Criação, edição e listagem de `Appointment` funcionam na interface.

### Regressão e Testes
- [ ] A suíte de testes de regressão existente (`tests/e2e_test_runner.ts`) continua executando com sucesso (100% de aprovação).
- [ ] Novos testes automatizados cobrem as operações de `Appointment` e as novas ferramentas MCP.
- [ ] Os serviços Docker sobem normalmente via `docker-compose up -d` com status saudável.

## 2026-09-21T18:42:15Z

Implementar as novas visões especializadas no frontend (Sprint Kanban, Visão Acadêmica e Calendário de Compromissos e Prazos) e consolidar a expansão dos testes E2E e orquestração Docker do BrainBoard.

Working directory: C:\Users\Kaue\Desktop\BrainBoard
Integrity mode: development

## Requirements

### R1. Visões Especializadas no Frontend (Milestone 3)
Construir e integrar na interface React (Vite + TailwindCSS) as três novas visões especializadas conectadas aos módulos já existentes no backend:
1. **Sprint Kanban**: Visualização filtrada para exibir e gerenciar as tarefas marcadas na sprint ativa semanal (`isSprintActive === true`), com movimentação de status e controle de subtarefas.
2. **Visão Acadêmica**: Visualização dedicada aos projetos do tipo `ACADEMIC` (disciplinas universitárias e cursos), listando matérias, entregas pendentes e contagem regressiva de prazos.
3. **Calendário Completo de Compromissos**: Interface de calendário com visualização de agendamentos (`Appointment`) e datas de entrega (`dueDate`) das tarefas, permitindo a criação e conclusão de compromissos com data/hora e local/link.
4. **Navegação e Alternância**: Adicionar barra de abas ou navegação fluida no topo/sidebar para alternar entre: *Visão Geral de Projetos*, *Quadro do Projeto*, *Sprint Semanal*, *Área Acadêmica* e *Calendário*.

### R2. Expansão dos Testes E2E (Milestone 4)
Expandir a suíte de testes em `tests/e2e_test_runner.ts` para cobrir:
- Criação, listagem e atualização de `Appointment`s via REST.
- Validação das 3 novas ferramentas MCP adicionadas no backend (`create_appointment`, `list_upcoming_deadlines`, `add_to_sprint`).
- Garantir que todos os testes anteriores e novos continuem passando com 100% de sucesso.

### R3. Sanidade de Deploy e Orquestração
- Garantir que tanto o backend quanto o frontend compilem para produção (`npm run build`) sem nenhum erro de TypeScript (`tsc`).
- Verificar a integridade das configurações do `docker-compose.yml` e do proxy Nginx para suportar tanto as rotas da SPA quanto os endpoints de SSE do MCP.

## Acceptance Criteria

### Compilação e Qualidade
- [ ] `npm --prefix backend run build` compila com 0 erros de tipagem TypeScript.
- [ ] `npm --prefix frontend run build` compila com 0 erros e gera os artefatos de produção em `frontend/dist`.

### Testes Automatizados E2E
- [ ] A execução de `npx tsx tests/e2e_test_runner.ts` passa com 100% de sucesso em todos os tiers, sem falhas nem regressões.

### Experiência de Uso no Frontend
- [ ] Usuário consegue navegar fluidamente entre o quadro do projeto, a visão de sprint, a visão acadêmica e o calendário.
- [ ] Tarefas podem ser adicionadas/removidas da sprint ativa na interface.
- [ ] Compromissos podem ser cadastrados e visualizados no calendário com suas respectivas datas e horários.


## 2026-10-26T14:20:00Z

Reformulate the BrainBoard frontend interface (`frontend/`) into a high-craft productivity and academic studio inspired by the UI dashboard references on `https://br.pinterest.com/leandratognin/web-layout-de-sites-inspira%C3%A7%C3%B5es/` (Virtus, Timesheet UI, Veltrix, Settle Go, and Week Progress radial UI), adopting a hybrid visual direction (clean modular UI layout enriched with custom AI-generated editorial covers and empty-state/banner illustrations) and a committed left sidebar + 3-zone layout as the unified default experience on `/`.

Working directory: C:\Users\Kaue\Desktop\BrainBoard
Integrity mode: development

Reference material:
- `AGENTS.md`, `REDESIGN_BRIEF.md`, `REDESIGN_PLAN.md`, `DESIGN_GAP_REVIEW.md`, `IMPLEMENTATION_PLAN.md`
- `.impeccable/surfaces/frontend-src-app-tsx.md` (active surface brief)
- `C:\Users\Kaue\.gemini\antigravity-cli\brain\1b69d644-c2d5-497b-822b-26b1f41261cc\scratch\pin_1.jpg` .. `pin_10.jpg` (extracted reference pins from the Pinterest board)

## Requirements

### R1. Unified Shell, Navigation & 3-Zone Overview (`/`)
Consolidate and verify the application shell (`frontend/src/App.tsx`, `frontend/src/components/Navbar.tsx`, `frontend/src/components/TopHeader.tsx`, `frontend/src/components/DashboardOverviewPage.tsx`) around a committed deep-indigo/slate left sidebar with project quick-switching and discreet `4:3` cover thumbnails (`getProjectCover`), a horizontal studio command header (`Ctrl+K` search with ABNT2 `AltGraph`/`isComposing` keyboard guard, theme toggle, sync, and context actions), and a 3-zone Overview page featuring radial focus telemetry, dated tabular task rows (`Timesheet` style), hybrid project cards, 7-day agenda, and honest `Em breve` module rows.

### R2. Portfolio, Project Kanban & Focus Boards
Reformulate the project portfolio (`frontend/src/components/ProjectList.tsx`, `frontend/src/components/ProjectCard.tsx`), project Kanban workspace (`frontend/src/components/DashboardOverview.tsx`, `frontend/src/components/KanbanBoard.tsx`, `frontend/src/components/KanbanColumn.tsx`, `frontend/src/components/StageColumn.tsx`, `frontend/src/components/TaskCard.tsx`), and global/project Focus view (`frontend/src/components/sprint/SprintKanbanView.tsx`) to use unified hairlined telemetry bars (including an SVG radial progress gauge in `DashboardOverview.tsx`), `12px–16px` panel radii (`.bb-panel`), single-border elevation without soft drop-shadow haze, tabular numeric alignment (`JetBrains Mono` / `.bb-tabular`), and zero uppercase eyebrow/kicker labels above headings.

### R3. Calendar & Academic Views
Reformulate `frontend/src/components/calendar/CalendarView.tsx` and `frontend/src/components/academic/AcademicView.tsx` to match the studio visual language, including dated tabular agenda rows in the calendar, removal of uppercase eyebrows/kickers above headings, and discreet illustrated cover thumbnails (`getProjectCover`) on academic subject cards and active subject headers, preserving all CRUD flows and real backend API contracts.

### R4. Custom AI Visual Assets & Editorial Covers
Generate cohesive, high-craft AI illustrations/covers (using the `image-generator` subagent or image generation tools) where they elevate the studio atmosphere — such as the Overview focus banner, Academic studio header, empty states, or project/subject cover set in `frontend/public/assets/` — harmonized with the deep-indigo, slate, emerald, and warm-amber palette. Embed AI provenance metadata on every generated raster asset using `.agents\skills\impeccable\scripts\impeccable.cmd embed-prompt --file <path> --prompt "<prompt>" --model "<model>"`.

### R5. Repository, Accessibility & Data Honesty Constraints
Preserve all existing local changes and follow `AGENTS.md`, `REDESIGN_BRIEF.md`, and `REDESIGN_PLAN.md`: never run `git push`, never open visible PowerShell/CMD windows, never invent fake metrics or unbacked controls (keep `Produtividade`, `Sequência`, and `Relógio` labeled `Em breve`), maintain full light/dark theme parity and `prefers-reduced-motion` support, update `DESIGN.md` with the finalized design system tokens, and never copy internal design-contract prose into source code comments.

## Verification Resources

- Frontend build & typecheck: `npm --prefix frontend run build`
- Formatting & diff check: `git diff --check`
- Impeccable mechanical & provenance checks:
  - `.agents\skills\impeccable\scripts\impeccable.cmd detect --target frontend/src --json`
  - `.agents\skills\impeccable\scripts\impeccable.cmd embed-prompt --scan frontend/public/assets`
  - `.agents\skills\impeccable\scripts\impeccable.cmd surface-brief read frontend/src/App.tsx`
- Live dev environment: Backend on `http://localhost:3000` (`/api/health`) and Vite dev server on `http://localhost:5173`

## Acceptance Criteria

### Build, Type Safety & Mechanical Craft
- [ ] `npm --prefix frontend run build` succeeds with zero TypeScript or Vite bundling errors.
- [ ] `git diff --check` returns zero formatting or whitespace issues.
- [ ] `.agents\skills\impeccable\scripts\impeccable.cmd detect --target frontend/src --json` reports zero high-severity craft violations (no uppercase kickers/eyebrows above `h1`/`h2`/`h3`, no border + wide soft drop-shadow combinations on cards at rest, no copied design-contract phrases in source comments).
- [ ] Any newly generated AI raster assets in `frontend/public/assets/` pass `.agents\skills\impeccable\scripts\impeccable.cmd embed-prompt --scan frontend/public/assets` with embedded provenance metadata.

### Visual, Responsive & Functional Verification
- [ ] All 6 primary surfaces (`Visão Geral`, `Projetos`, `Quadro Kanban do Projeto`, `Foco`, `Calendário`, `Acadêmico`) render without horizontal overflow, clipped text, or broken image links at desktop (`1440x900`) and mobile (`390x844`) viewports in both light and dark themes, with verification screenshots saved to `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`.
- [ ] Every interactive flow (switching views from the committed sidebar, opening a project board, filtering with `Ctrl+K` without breaking ABNT2 `AltGr` input, toggling light/dark theme, viewing focus tasks, calendar events, and academic subjects) works against the live API without console or uncaught page errors.
- [ ] Unimplemented modules (`Produtividade`, `Sequência`, `Relógio`) are displayed as honest `Em breve` items with zero fabricated metrics.
- [ ] `DESIGN.md` is updated to document the finalized Onest + JetBrains Mono typography, Virtus/Timesheet hybrid palette, AI visual assets, and component patterns.


## 2026-10-26T19:35:20Z

Implement a full-stack User Authentication, Project Collaborators, and Task Assignment system in BrainBoard (`backend/` + `frontend/`), while executing a ruthless Impeccable **Distill & Polish (Anti-AI-Slop)** pass across the entire frontend to eliminate generic AI visual clichés, badge/pill clutter, default Tailwind indigo/blurple saturation, sci-fi background image bleed, and repetitive filler copy.

Working directory: C:\Users\Kaue\Desktop\BrainBoard
Integrity mode: development

Reference material:
- `.agents/skills/impeccable/SKILL.md`, `.agents/skills/impeccable/reference/craft-floor.md`, `.agents/skills/impeccable/reference/distill.md`, `.agents/skills/impeccable/reference/polish.md`
- `AGENTS.md`, `DESIGN.md`, `REDESIGN_PLAN.md`
- `.impeccable/surfaces/frontend-src-app-tsx.md`
- Current visual baseline to critique and de-slop: `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`

## Requirements

### R1. User Accounts, Authentication & Safe Data Backfill
Add persistent `User` accounts (`id`, `name`, `email`, password hash, avatar/initials color, timestamps) and authentication endpoints (register, login, logout, current session user, and user lookup/search for collaboration). Safely preserve and backfill existing projects and workspace records in the database to a default/seeded user account (or claim on first registration) so zero local data is lost or orphaned.

### R2. Project Ownership, Collaborators & Scoped Visibility
Associate every project with an owner (`User`) and allow adding/removing other registered `User` accounts as project collaborators (`OWNER`, `COLLABORATOR`). Enforce access control across project, stage, task, dashboard overview, and calendar endpoints so each authenticated user only sees and accesses projects where they are either the owner or an added collaborator.

### R3. Task Assignment to Project Collaborators
Allow tasks within a project to be assigned (or unassigned/reassigned) to any valid member of that project (the project owner or any added collaborator) during task creation and task editing/board interaction. Expose assignee details (`id`, `name`, `email`) in task API responses and display the assignee initials/name cleanly on task rows and Kanban cards.

### R4. Impeccable Anti-AI-Slop Distill & Polish Across All Surfaces
Apply `.agents/skills/impeccable/reference/craft-floor.md`, `distill.md`, and `polish.md` to eliminate every "AI slop" tell visible in `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`:
1. **Kill Generic Tailwind Indigo/Blurple (`#6366f1`) Saturation**: Replace default `indigo-500`/`indigo-600` primary fills and badges with a refined architectural studio palette (e.g., high-contrast ink/graphite `#141824` / `#f8fafc` primary actions or deep cobalt/vermilion/emerald functional accents with restrained neutral surfaces). Primary CTAs must look like crisp software controls (`h-9` / `h-10`, `rounded-lg`), never bloated pill buttons.
2. **Eliminate Badge, Pill & Icon-Box Soup**:
   - Remove redundant inline pills next to page titles (e.g., delete `[Painel principal]` next to `Visão geral` and delete `[⚡ Prioridade em foco]` under the focus title).
   - Remove decorative icons next to section headings (`CalendarIcon`, `Sparkles`, `Zap`, etc.). Let typography and weight establish hierarchy.
   - In `Tarefas em Foco` (`DashboardOverviewPage.tsx`), remove the repetitive `[✓ Foco]` square icon box repeated on every undated row; use a clean tabular index (`01`, `02`...) or status dot + concise project/stage metadata, and show a date badge only when a real `dueDate` exists.
   - Distill `Recursos em Avaliação (Em breve)` from a bulky 3-row icon-box card with verbose AI descriptions into a compact, single-block muted footer strip (`Em breve: Produtividade · Sequência · Relógio de foco`).
3. **Remove Sci-Fi/Fantasy Wallpaper Bleed Behind Text**:
   - Remove the full-bleed sci-fi mountain/planet image (`/assets/overview-hero.jpg`) from behind the typography in `DashboardOverviewPage.tsx` and `ProjectList.tsx`. Keep text surfaces 100% clean, architectural, and high-contrast. Use discreet, editorial abstract/geometric thumbnails (`4:3` or compact header strips) only where they belong (sidebar thumbnails and project/academic cards).
4. **Fix Fake/Static Data Visualizations & Verbose AI Copy**:
   - In `Status dos Projetos`, replace the fake static `border-8` ring with a true proportional multi-segment SVG ring or a crisp hairlined horizontal/tabular breakdown that accurately reflects `active`, `planning`, and `completed` ratios.
   - Cut verbose, robotic helper copy in half across headers, empty states, and banners (no sentences explaining how to click a button right above the button).

### R5. Studio UI for Auth, Collaborators & Task Assignees
Build the new authentication and collaboration flows using the distilled, anti-slop studio language:
- **Auth screen**: Crisp, minimal login and registration view (`14px` `.bb-panel`, high-contrast inputs, zero marketing fluff or AI clichés).
- **Shell identity**: Compact user profile indicator (avatar initials + name/email) and logout button in the committed left sidebar (`Navbar.tsx`).
- **Project Collaborators UI**: Compact avatar stack on project headers/cards and a clean Collaborators modal/popover (`KanbanBoard.tsx` / `TopHeader.tsx`) to invite registered users by email/name, view roles (`Owner` / `Colaborador`), and remove collaborators.
- **Task Assignee UI**: Collaborator selector in `CreateTaskModal.tsx` and quick assignee switcher/badge on `TaskCard.tsx` and `SprintKanbanView.tsx`.

### R6. Repository & Operational Constraints
Follow `AGENTS.md`: never run `git push`, never open visible PowerShell/CMD windows, keep total subagents within the repository ceiling, preserve existing features and data, and update `DESIGN.md` to reflect the distilled anti-slop token system.

## Verification Resources

- Database & Backend build/validation:
  - `npx --prefix backend prisma validate`
  - `npm --prefix backend run build` (or `npx --prefix backend tsc --noEmit`)
- Frontend build & typecheck:
  - `npm --prefix frontend run build`
- Formatting & diff check:
  - `git diff --check`
- Impeccable mechanical craft detector:
  - `.agents\skills\impeccable\scripts\impeccable.cmd detect --target frontend/src --json`
- Live environment:
  - Backend API on `http://localhost:3000` (`/api/health`) and Frontend dev server on `http://localhost:5173`

## Acceptance Criteria

### Backend, Database & Multi-User Isolation
- [ ] Prisma schema validates and migrates/pushes cleanly without data loss; both `backend` and `frontend` compile with zero TypeScript errors.
- [ ] Programmatic API verification confirms end-to-end multi-user behavior:
  1. Registering User A and User B succeeds and returns valid auth sessions/tokens.
  2. A project created by User A is visible to User A in `GET /api/projects` and `GET /api/dashboard/overview`, and is **not** visible to User B before collaboration.
  3. User A adding User B as a collaborator on the project makes the project immediately visible and accessible to User B in `GET /api/projects` and `GET /api/projects/:id`.
  4. Assigning a project task to User B persists `assigneeId` and returns User B's user summary in task payloads.
  5. Removing User B from the project revokes User B's access to the project and clears or safely handles their task assignment.

### Impeccable Anti-AI-Slop & Visual Verification
- [ ] `.agents\skills\impeccable\scripts\impeccable.cmd detect --target frontend/src --json` returns `[]` (zero craft violations).
- [ ] Source inspection confirms zero default `indigo-500`/`indigo-600` button/badge saturation, zero sci-fi hero wallpaper behind text in `DashboardOverviewPage.tsx` and `ProjectList.tsx`, zero repetitive `[✓ Foco]` icon boxes on undated focus rows, and a compact distilled `Em breve` indicator.
- [ ] Live browser verification at desktop (`1440x900`) and mobile (`390x844`) viewports in both light and dark themes confirms that Auth, Overview, Projects, Kanban Board (with Collaborators modal & Task Assignee), Focus, Calendar, and Academic views render with zero horizontal overflow and zero console errors, with fresh screenshots saved to `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`.


## 2026-10-27T13:10:08Z

Implement a full-stack User Authentication, Project Collaborators, and Task Assignment system in BrainBoard (`backend/` + `frontend/`), while executing a ruthless Impeccable **Distill & Polish (Anti-AI-Slop)** pass across the entire frontend to eliminate generic AI visual clichés, badge/pill clutter, default Tailwind indigo/blurple saturation, sci-fi background image bleed, and repetitive filler copy.

Working directory: C:\Users\Kaue\Desktop\BrainBoard
Integrity mode: development

Reference material:
- `C:\Users\Kaue\.gemini\skills\impeccable\SKILL.md`, `C:\Users\Kaue\.gemini\skills\impeccable\reference\craft-floor.md`, `C:\Users\Kaue\.gemini\skills\impeccable\reference\distill.md`, `C:\Users\Kaue\.gemini\skills\impeccable\reference\polish.md`
- `AGENTS.md`, `DESIGN.md`, `REDESIGN_PLAN.md`
- `.impeccable/surfaces/frontend-src-app-tsx.md`
- Current visual baseline to critique and de-slop: `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`

## Requirements

### R1. User Accounts, Authentication & Safe Data Backfill
Add persistent `User` accounts (`id`, `name`, `email`, password hash, avatar/initials color, timestamps) and authentication endpoints (register, login, logout, current session user, and user lookup/search for collaboration). Safely preserve and backfill existing projects and workspace records in the database to a default/seeded user account (`admin@brainboard.local`) so zero local data is lost or orphaned.

### R2. Project Ownership, Collaborators & Scoped Visibility
Associate every project with an owner (`User`) and allow adding/removing other registered `User` accounts as project collaborators (`OWNER`, `COLLABORATOR`). Enforce access control across project, stage, task, dashboard overview, and calendar endpoints so each authenticated user only sees and accesses projects where they are either the owner or an added collaborator.

### R3. Task Assignment to Project Collaborators
Allow tasks within a project to be assigned (or unassigned/reassigned) to any valid member of that project (the project owner or any added collaborator) during task creation and task editing/board interaction. Expose assignee details (`id`, `name`, `email`, `avatarColor`) in task API responses and display the assignee initials/name cleanly on task rows and Kanban cards.

### R4. Impeccable Anti-AI-Slop Distill & Polish Across All Surfaces
Apply `impeccable` (`craft-floor.md`, `distill.md`, and `polish.md`) to eliminate every "AI slop" tell across `frontend/src/`:
1. **Kill Generic Tailwind Indigo/Blurple (`#6366f1`) Saturation**: Replace default `indigo-500`/`indigo-600` primary fills and badges with a refined architectural studio palette (e.g., high-contrast ink/graphite `#141824` / `#f8fafc` primary actions or deep cobalt/vermilion/emerald functional accents with restrained neutral surfaces). Primary CTAs must look like crisp software controls (`h-9` / `h-10`, `rounded-lg`), never bloated pill buttons.
2. **Eliminate Badge, Pill & Icon-Box Soup**:
   - Remove redundant inline pills next to page titles (e.g., delete `[Painel principal]` next to `Visão geral` and delete `[⚡ Prioridade em foco]` under the focus title).
   - Remove decorative icons next to section headings (`CalendarIcon`, `Sparkles`, `Zap`, etc.). Let typography and weight establish hierarchy.
   - In `Tarefas em Foco` (`DashboardOverviewPage.tsx`), remove the repetitive `[✓ Foco]` square icon box repeated on every undated row; use a clean tabular index (`01`, `02`...) or status dot + concise project/stage metadata, and show a date badge only when a real `dueDate` exists.
   - Distill `Recursos em Avaliação (Em breve)` from a bulky 3-row icon-box card with verbose AI descriptions into a compact, single-block muted footer strip (`Em breve: Produtividade · Sequência · Relógio de foco`).
3. **Remove Sci-Fi/Fantasy Wallpaper Bleed Behind Text**:
   - Remove full-bleed sci-fi mountain/planet images (`/assets/overview-hero.jpg`, etc.) from behind the typography in `DashboardOverviewPage.tsx` and `ProjectList.tsx`. Keep text surfaces 100% clean, architectural, and high-contrast. Use discreet, editorial abstract/geometric thumbnails (`4:3` or compact header strips) only where they belong (sidebar thumbnails and project/academic cards).
4. **Fix Fake/Static Data Visualizations & Verbose AI Copy**:
   - In `Status dos Projetos`, replace any static `border-8` ring with a true proportional multi-segment SVG ring or a crisp hairlined horizontal/tabular breakdown that accurately reflects `active`, `planning`, and `completed` ratios.
   - Cut verbose, robotic helper copy in half across headers, empty states, and banners (no sentences explaining how to click a button right above the button).

### R5. Studio UI for Auth, Collaborators & Task Assignees
Build the new authentication and collaboration flows using the distilled, anti-slop studio language:
- **Auth screen**: Crisp, minimal login and registration view (`14px` `.bb-panel`, high-contrast inputs, zero marketing fluff or AI clichés, plus quick demo login option for `admin@brainboard.local`).
- **Shell identity**: Compact user profile indicator (avatar initials + name/email) and account switch / logout button in the committed left sidebar (`Navbar.tsx`).
- **Project Collaborators UI**: Compact avatar stack on project headers/cards and a clean Collaborators modal (`KanbanBoard.tsx` / `TopHeader.tsx` / `ProjectCard.tsx`) to invite registered users by email/name, view roles (`Owner` / `Colaborador`), and remove collaborators.
- **Task Assignee UI**: Collaborator selector in `CreateTaskModal.tsx` and quick assignee switcher/badge on `TaskCard.tsx` and `SprintKanbanView.tsx`.

### R6. Repository & Operational Constraints
Follow `AGENTS.md`: never run `git push`, never open visible PowerShell/CMD windows, keep total subagents within the repository ceiling, preserve existing features and data, and update `DESIGN.md` to reflect the distilled anti-slop token system.

## Verification Resources

- Database & Backend build/validation:
  - `npx --prefix backend prisma validate`
  - `npx --prefix backend prisma db push`
  - `npm --prefix backend run build`
- Frontend build & typecheck:
  - `npm --prefix frontend run build`
- Formatting & diff check:
  - `git diff --check`
- Impeccable mechanical craft detector:
  - `C:\Users\Kaue\.gemini\skills\impeccable\scripts\impeccable.cmd detect --target frontend/src --json`
- Live environment:
  - Backend API on `http://localhost:3000` (`/api/health`) and Frontend dev server on `http://localhost:5173`

## Acceptance Criteria

### Backend, Database & Multi-User Isolation
- [ ] Prisma schema validates and pushes cleanly without data loss; both `backend` and `frontend` compile with zero TypeScript errors.
- [ ] Programmatic API verification confirms end-to-end multi-user behavior:
  1. Registering User A and User B succeeds and returns valid auth sessions/tokens.
  2. A project created by User A is visible to User A in `GET /api/projects` and `GET /api/dashboard/overview`, and is **not** visible to User B before collaboration.
  3. User A adding User B as a collaborator on the project makes the project immediately visible and accessible to User B in `GET /api/projects` and `GET /api/projects/:id`.
  4. Assigning a project task to User B persists `assigneeId` and returns User B's user summary in task payloads.
  5. Removing User B from the project revokes User B's access to the project and clears their task assignment in that project.

### Impeccable Anti-AI-Slop & Visual Verification
- [ ] `C:\Users\Kaue\.gemini\skills\impeccable\scripts\impeccable.cmd detect --target frontend/src --json` returns `[]` (zero craft violations).
- [ ] Source inspection confirms zero default `indigo-500`/`indigo-600` button/badge saturation, zero sci-fi hero wallpaper behind text in `DashboardOverviewPage.tsx` and `ProjectList.tsx`, zero repetitive `[✓ Foco]` icon boxes on undated focus rows, and a compact distilled `Em breve` indicator.
- [ ] Live browser verification at desktop (`1440x900`) and mobile (`390x844`) viewports in both light and dark themes confirms that Auth, Overview, Projects, Kanban Board (with Collaborators modal & Task Assignee), Focus, Calendar, and Academic views render with zero horizontal overflow and zero console errors.

# Project: FocusTask

## Architecture
FocusTask is an intelligent personal Kanban board with AI integration via Model Context Protocol (MCP) Server-Sent Events (SSE).
- **Frontend**: React 18 SPA built with Vite and TailwindCSS, served by an Alpine Nginx reverse proxy. Provides task boards (TODO, IN_PROGRESS, DONE), category filtering (PROJECT, COLLEGE, PERSONAL), subtask checklists, and optimistic state updates.
- **Backend**: Node.js & Express service with Prisma ORM connecting to PostgreSQL (AWS Neon). Dual interface: standard REST API for the frontend and MCP JSON-RPC over SSE for external AI agents.
- **Data Flow**:
  - Browser User -> Nginx -> / (Static Assets) / /api (REST proxy) -> Express Backend -> Prisma -> Neon DB.
  - AI Agents -> Nginx -> /mcp/sse & /mcp/messages -> Express MCP Server -> Prisma -> Neon DB.
- **Deployment**: Multi-stage Docker containers for frontend and backend orchestrated by docker-compose.yml.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Task CRUD (REST) | Create, read, update status/details, delete tasks via REST API | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Subtask Management (REST) | Add, toggle (isDone), and delete subtasks linked to tasks | M1 | ORIGINAL_REQUEST §R1 |
| 3 | MCP Tools Registration & Handlers | list_tasks, create_task, move_task, add_subtask, toggle_subtask | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Multi-Client MCP SSE Session Management | Session map with UUID routing and connection cleanup | M1 | Survey (Defect 4) |
| 5 | Extended REST Endpoints & Health Check | GET /api/tasks/:id, GET /api/health for container liveness | M1 | Survey (Defect 1.3) |
| 6 | Extended MCP Tools for Autonomous Agents | update_task, delete_task, delete_subtask, get_task | M1 | Survey (Defect 1.4) |
| 7 | Backend Service Architecture & Deduplication | TaskService and SubtaskService separating business logic from routes | M1 | ORIGINAL_REQUEST §R2 |
| 8 | Backend TypeScript Build & Packaging | Enable outDir ./dist in tsconfig.json for production execution | M1 | Survey (Defect 2) |
| 9 | Frontend TypeScript Build Blocker Fix | Exclude task.test.ts from tsconfig.json build or fix types | M2 | Survey (Defect 1) |
| 10 | Kanban 3-Column Board | Drag/button column movement across TODO, IN_PROGRESS, DONE | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Category Filter Bar | Filter tasks by ALL, PROJECT, COLLEGE, PERSONAL with counts | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Subtask Interactive Checklist UI | Inline subtask creation, checkbox toggle, progress indicator | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Task Creation Modal | Modal dialog with title, category, description validation | M2 | ORIGINAL_REQUEST §R2 |
| 14 | Free-text Search Filter | Search bar filtering tasks by title and description | M2 | Survey (UI Enhancements) |
| 15 | Vite Dev Server Proxy for MCP | Mirror /mcp proxy in vite.config.ts for local dev parity | M2 | Survey (UI Enhancements) |
| 16 | Root & Subproject .dockerignore | Prevent node_modules and host files leaking into Docker context | M3 | Survey (Defect 3) |
| 17 | Nginx SSE Proxy Hardening | proxy_read_timeout 24h and buffering off for robust SSE | M3 | Survey (Defect 5) |
| 18 | Docker Compose Production Readiness | Healthcheck on backend, condition: service_healthy on frontend | M3 | ORIGINAL_REQUEST §R3 |
| 19 | Frontend & Backend Dockerfile Optimization | Production multi-stage builds with proper entrypoints | M3 | ORIGINAL_REQUEST §R3 |
| 20 | Complete E2E Test Suite Pass (Offline & Live) | 37/37 tests pass in both offline contract and live server execution | M4 | ORIGINAL_REQUEST §Acceptance Criteria |
| 21 | Adversarial Integrity & Quality Audit | Comprehensive static and runtime checks by Forensic Auditor | M4 | System Policy |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Completion & Architecture Refinement | Features 1-8: Service layer, SSE session map, missing REST/MCP endpoints, tsconfig fix | none | PLANNED |
| M2 | Frontend Construction & Core Kanban Features | Features 9-15: Fix TS build blocker, text search, UI polish, dev proxy | M1 | PLANNED |
| M3 | Dockerization & Nginx Orchestration | Features 16-19: .dockerignore files, Nginx SSE config, healthcheck, docker-compose | M1, M2 | PLANNED |
| M4 | Final Acceptance & Adversarial Hardening | Features 20-21: 100% E2E test suite pass (offline & live), full audit | M1, M2, M3 | PLANNED |

## Interface Contracts

### 1. REST API
- GET /api/tasks?category=<enum>&status=<enum> -> Task[] with nested subtasks
- GET /api/tasks/:id -> Task with subtasks (404 if not found)
- POST /api/tasks -> Body { title: string, category: Category, description?: string } -> 201 Task
- PATCH /api/tasks/:id -> Body { status?: Status, title?: string, description?: string, category?: Category } -> 200 Task
- DELETE /api/tasks/:id -> 204 No Content
- POST /api/tasks/:id/subtasks -> Body { title: string } -> 201 Subtask
- PATCH /api/subtasks/:id -> Body { isDone?: boolean } (or toggle if omitted) -> 200 Subtask
- DELETE /api/subtasks/:id -> 204 No Content
- GET /api/health -> { status: 'ok', uptime: number, timestamp: string }

### 2. MCP Server Protocol (SSE)
- Server Name: 'braindboard-mcp' (preserved for test harness contract)
- Endpoints:
  - GET /mcp/sse: Establishes SSE stream. Sends endpoint event with /mcp/messages?sessionId=<uuid>.
  - POST /mcp/messages?sessionId=<uuid>: Handles JSON-RPC requests.
- Tools:
  - list_tasks(category?, status?): Returns JSON formatted tasks.
  - create_task(title, category, description?): Returns success confirmation.
  - move_task(id, status): Returns transition confirmation.
  - dd_subtask(taskId, title): Returns subtask confirmation.
  - 	oggle_subtask(id, isDone?): Returns toggle confirmation.
  - update_task(id, title?, description?, category?): Returns update confirmation.
  - delete_task(id): Returns deletion confirmation.
  - delete_subtask(id): Returns subtask deletion confirmation.
  - get_task(id): Returns single task JSON.

### 3. E2E Test Contract Preservation
- ackend/src/index.ts MUST contain exact token strings required by 	ests/e2e_test_runner.ts static inspection:
  - Tool names: 'list_tasks', 'create_task', 'move_task', 'add_subtask', 'toggle_subtask'
  - SSE routes: pp.get('/mcp/sse', pp.post('/mcp/messages', SSEServerTransport
  - Handler signatures: 
ame === 'add_subtask', 
ame === 'toggle_subtask', 
ame === 'list_tasks'
  - Route signatures: pp.get('/api/tasks', pp.post('/api/tasks', pp.patch('/api/tasks/:id', pp.delete('/api/tasks/:id', pp.post('/api/tasks/:id/subtasks', pp.patch('/api/subtasks/:id', pp.delete('/api/subtasks/:id'
  - String: raindboard-mcp
  - Filter logic: if (args?.category) filters.category = args.category and if (args?.status) filters.status = args.status

## Code Layout
- ackend/
  - src/
    - index.ts: Application bootstrap, Express routes, MCP server registrations (preserving static contract tokens)
    - services/: Encapsulated business logic (	ask.service.ts, subtask.service.ts)
    - mcp/: Modular MCP tools definitions and SSE connection manager
  - prisma/: schema.prisma
  - 	sconfig.json: outDir: ./dist, rootDir: ./src
  - Dockerfile
  - .dockerignore
- rontend/
  - src/
    - components/: KanbanBoard.tsx, KanbanColumn.tsx, TaskCard.tsx, SubtaskItem.tsx, CreateTaskModal.tsx, Navbar.tsx
    - services/: pi.ts
    - 	ypes/: 	ask.ts, 	ask.test.ts
  - 	sconfig.json: excludes test files from production build
  - ite.config.ts: dev proxies for /api and /mcp
  - 
ginx.conf: Nginx SPA and API/SSE reverse proxy
  - Dockerfile
  - .dockerignore
- 	ests/
  - e2e_test_runner.ts: 37-test multi-tier automated test harness
- docker-compose.yml: Multi-service orchestration
- .dockerignore: Root context exclusions

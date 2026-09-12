# FocusTask E2E Test Infrastructure

## 1. Overview & Architecture

The FocusTask test infrastructure is an automated, opaque-box verification system built to validate the 28 features of the FocusTask Personal Kanban system against authoritative specifications defined in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

```
                  +----------------------------------------------+
                  |         FocusTask E2E Test Harness           |
                  |          (tests/e2e_test_runner.ts)          |
                  +----------------------+-----------------------+
                                         |
            +----------------------------+----------------------------+
            |                                                         |
  [Tier 1: Feature Coverage]                                [Tier 2: Boundaries & Corners]
  - Backend MCP Tools (R1)                                  - Empty & Whitespace Titles (400)
  - Backend REST API (R2)                                   - Long Titles/Descriptions Stress
  - Frontend UI Contracts (R2)                              - Special Characters, XSS & SQLi
  - Docker Configuration (R3)                               - Non-Existent UUIDs (404)
            |                                               - Cascade Deletion Guarantee
            |                                                         |
  [Tier 3: Cross-Feature Combos]                             [Tier 4: Real-World Scenarios]
  - Complete Task Lifecycle                                 - Agile Sprint Delivery (PROJECT)
  - Dual MCP <-> REST Synchronization                       - Exam Preparation (COLLEGE)
  - Multi-Filter Matrix (Cat x Status)                      - Weekend Home Errands (PERSONAL)
            +----------------------------+----------------------------+
                                         |
                         +---------------+---------------+
                         |                               |
                 [Offline Contract]               [Live HTTP/SSE]
                 - Prisma Schema AST              - REST CRUD Endpoints
                 - Express Route AST              - MCP Tools via SSE/JSON-RPC
                 - Dockerfile Directives          - Neon DB Active Operations
                 - React UI Component AST
```

---

## 2. Test Hierarchy (4 Tiers)

### Tier 1: Feature Coverage
Validates the fundamental existence, interface contracts, and behaviors across four distinct domains:
1. **Backend MCP Server (`BACKEND_MCP`)**:
   - Tool registrations: `list_tasks`, `create_task`, `move_task`, `add_subtask`, `toggle_subtask`.
   - SSE transport: `GET /mcp/sse` and `POST /mcp/messages`.
   - Tool execution schemas and return signatures.
2. **Backend REST API (`BACKEND_REST`)**:
   - Endpoints: `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`.
   - Subtask routes: `POST /api/tasks/:id/subtasks`, `PATCH /api/subtasks/:id`, `DELETE /api/subtasks/:id`.
3. **Frontend UI Contracts (`FRONTEND_UI_CONTRACTS`)**:
   - 3-column Kanban layout: TODO ("A Fazer"), IN_PROGRESS ("Em Andamento"), DONE ("Concluído").
   - Category filtering: Todas, Projetos (`PROJECT`), Faculdade (`COLLEGE`), Pessoais (`PERSONAL`).
   - Interactive components: `CreateTaskModal`, `TaskCard` movement controls, subtask checklists, and inline subtask creation.
4. **Docker Configurations (`DOCKER_CONFIGS`)**:
   - `backend/Dockerfile`: Alpine 20 base, Prisma client generation, port 3000 exposure.
   - `frontend/Dockerfile`: Multi-stage build (`node:20-alpine` build -> `nginx:alpine` runtime).
   - `docker-compose.yml`: Multi-service composition linking backend and frontend with remote Neon DB connection.
   - `frontend/nginx.conf`: Nginx reverse proxy routing `/api/` to `http://backend:3000` and SPA routing fallback.

### Tier 2: Boundary & Corner Cases
Probes negative conditions, extreme resource constraints, and data integrity guarantees:
- **T2-BND-01**: Empty string and whitespace-only titles rejected with 400 Bad Request.
- **T2-BND-02**: 1,000+ character titles and descriptions stored without truncation or database crash.
- **T2-BND-03**: Special characters, UTF-8 multibyte emojis, XSS payloads (`<script>alert(1)</script>`), and SQL injection strings (`'; DROP TABLE; --`) stored with byte-level fidelity.
- **T2-BND-04**: Non-existent UUIDs (`00000000-0000-0000-0000-000000000000`) return 404 Not Found.
- **T2-BND-05**: Invalid enum values for `category` and `status` rejected with 400 Bad Request.
- **T2-BND-06**: Cascade deletion verification (`onDelete: Cascade` in Prisma schema deletes all associated subtasks).
- **T2-BND-07**: Subtask toggle state inversion when `isDone` is omitted vs. idempotent setting when explicit boolean is supplied.
- **T2-BND-08**: Missing parent or title during subtask creation rejected with 400 / foreign key constraint violation.

### Tier 3: Cross-Feature Combinations
Validates end-to-end multi-step state mutations:
- **T3-CMB-01**: Full Task Lifecycle: Create TODO task -> Add 3 subtasks -> Toggle 2 to done -> Move to IN_PROGRESS -> Toggle final subtask -> Move to DONE -> Verify consistency -> Delete task -> Verify cascade cleanup.
- **T3-CMB-02**: Dual Interface Synchronization: Create via MCP -> Read via REST -> Add subtask via REST -> Toggle subtask via MCP -> Move status via REST -> Query filtered task via MCP -> Delete via REST -> Confirm 404 on both.
- **T3-CMB-03**: Multi-Filter Matrix: Create tasks across 3 categories and 3 statuses; query all 9 combinations via REST query params and MCP filters; verify exact subset isolation.
- **T3-CMB-04**: Subtask Scoping: Modifying/deleting subtasks in Task A has zero side effects on sibling Task B.

### Tier 4: Real-World Application Scenarios
Models actual user workflows and personas:
- **T4-SCN-01 (Agile Sprint Delivery)**: Full-stack engineer sets up MVP deployment epic (`PROJECT`), decomposes into Docker subtasks, tracks progress across Kanban columns, marks all done.
- **T4-SCN-02 (Academic Semester Exam Prep)**: CS student prepares for Distributed Systems final exam (`COLLEGE`), isolates college cards via category filter, checks off syllabus units.
- **T4-SCN-03 (Personal Errands Management)**: Individual creates weekend maintenance checklist (`PERSONAL`), checks off items on mobile browser, deletes obsolete items.

---

## 3. Test Runner Instructions

The test runner is located at `tests/e2e_test_runner.ts` and can be executed with `npx tsx`:

### Standard Execution (Contract & Structural Verification)
Runs static contract validation, Prisma schema analysis, Dockerfile inspection, and probes for live backend:
```bash
npx tsx tests/e2e_test_runner.ts
```

### Live Server Mode
Runs active HTTP requests and MCP tool calls against a running backend instance:
```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Run live test suite
npx tsx tests/e2e_test_runner.ts --live
```

### Tier Filtering
Run tests for a specific tier only:
```bash
npx tsx tests/e2e_test_runner.ts --tier=1
npx tsx tests/e2e_test_runner.ts --tier=2
npx tsx tests/e2e_test_runner.ts --tier=3
npx tsx tests/e2e_test_runner.ts --tier=4
```

### Custom Environment Overrides
```bash
WORKSPACE_DIR="C:/Users/Kaue/Desktop/BrainBoard" BACKEND_URL="http://localhost:3000" npx tsx tests/e2e_test_runner.ts
```

---

## 4. Test Matrix (Features vs. Tests)

| Feature # | Feature Name | Test ID | Tier | Authoritative Source | Verification Type |
|---|---|---|---|---|---|
| 1 | Task Model | T1-REST-01, T3-CMB-01 | 1, 3 | schema.prisma | Contract & Live |
| 2 | Subtask Model | T1-REST-05, T3-CMB-04 | 1, 3 | schema.prisma | Contract & Live |
| 3 | Cascade Deletion | T2-BND-06, T3-CMB-01 | 2, 3 | schema.prisma & Probe | Contract & Live |
| 4 | Category Enum | T1-MCP-02, T2-BND-05 | 1, 2 | schema.prisma | Contract & Live |
| 5 | Status Enum | T1-MCP-04, T2-BND-05 | 1, 2 | schema.prisma | Contract & Live |
| 6 | MCP Remote SSE Transport | T1-MCP-02 | 1 | ORIGINAL_REQUEST R1 | Contract & Live |
| 7 | MCP Message Posting | T1-MCP-02 | 1 | backend/src/index.ts | Contract & Live |
| 8 | MCP `list_tasks` | T1-MCP-05, T3-CMB-03 | 1, 3 | backend/src/index.ts | Contract & Live |
| 9 | MCP `create_task` | T1-MCP-01, T2-BND-02 | 1, 2 | backend/src/index.ts | Contract & Live |
| 10 | MCP `move_task` | T1-MCP-01, T3-CMB-02 | 1, 3 | backend/src/index.ts | Contract & Live |
| 11 | MCP `add_subtask` | T1-MCP-01, T1-MCP-03 | 1 | ORIGINAL_REQUEST R1 | Contract & Live |
| 12 | MCP `toggle_subtask` | T1-MCP-01, T1-MCP-04 | 1 | ORIGINAL_REQUEST R1 | Contract & Live |
| 13 | REST `GET /api/tasks` | T1-REST-01, T3-CMB-03 | 1, 3 | PROJECT.md Contract #2 | Contract & Live |
| 14 | REST `POST /api/tasks` | T1-REST-02, T2-BND-01 | 1, 2 | ORIGINAL_REQUEST R2 | Contract & Live |
| 15 | REST `PATCH /api/tasks/:id` | T1-REST-03, T2-BND-04 | 1, 2 | ORIGINAL_REQUEST R2 | Contract & Live |
| 16 | REST `DELETE /api/tasks/:id` | T1-REST-04, T2-BND-06 | 1, 2 | estrutura_projeto.md | Contract & Live |
| 17 | REST `POST /api/tasks/:id/subtasks` | T1-REST-05, T2-BND-08 | 1, 2 | ORIGINAL_REQUEST R2 | Contract & Live |
| 18 | REST `PATCH /api/subtasks/:id` | T1-REST-06, T2-BND-07 | 1, 2 | ORIGINAL_REQUEST R2 | Contract & Live |
| 19 | REST `DELETE /api/subtasks/:id` | T1-REST-07, T3-CMB-01 | 1, 3 | estrutura_projeto.md | Contract & Live |
| 20 | Frontend Kanban Board | T1-UI-01 | 1 | ORIGINAL_REQUEST R2 | Contract & Static |
| 21 | Category Filter Bar | T1-UI-02, T3-CMB-03 | 1, 3 | proposta_sistema_tarefas.md | Contract & Static |
| 22 | Task Creation Modal | T1-UI-03 | 1 | ORIGINAL_REQUEST R2 | Contract & Static |
| 23 | Task Card & Column Move | T1-UI-04 | 1 | ORIGINAL_REQUEST R2 | Contract & Static |
| 24 | Subtask Checklist UI | T1-UI-05 | 1 | ORIGINAL_REQUEST R2 | Contract & Static |
| 25 | Inline Subtask Addition | T1-UI-06 | 1 | ORIGINAL_REQUEST R2 | Contract & Static |
| 26 | Backend Dockerfile | T1-DOC-01 | 1 | ORIGINAL_REQUEST R3 | Contract & Static |
| 27 | Frontend Dockerfile & Nginx | T1-DOC-02, T1-DOC-04 | 1 | ORIGINAL_REQUEST R3 | Contract & Static |
| 28 | Docker Compose Orchestration | T1-DOC-03 | 1 | ORIGINAL_REQUEST R3 | Contract & Static |

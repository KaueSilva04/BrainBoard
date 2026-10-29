# Project: BrainBoard Academic & Calendar Multi-User Isolation

## Architecture
BrainBoard is a full-stack project management, academic planner, and calendar application:
- **Backend**: Node.js (ES Modules) with Express 5, TypeScript 5.9, Prisma ORM 6.19 connecting to Neon PostgreSQL.
- **Frontend**: React 18, Vite 6, TypeScript 5.6, Tailwind CSS. Single-page state-based routing via `App.tsx`.
- **Authentication**: JWT Bearer tokens passed via `Authorization: Bearer <token>`. Decoded user attached via `authMiddleware` to `req.user`.
- **Data Isolation Model**: Multi-tenant database where each user owns their records. Projects, tasks, and collaborators are isolated via `ownerId`/`userId`. Academic entities (`AcademicSubject`, `AcademicAssignment`) and calendar entities (`Appointment`) are isolated via foreign key `userId -> User.id`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | `Appointment` Schema Isolation | Add `userId String?` + relation to `User` + index on `Appointment` | M1 | Survey (Spec Miner §3.1) |
| 2 | `AcademicSubject` Schema Isolation | Add `userId String?` + relation to `User` + index on `AcademicSubject` | M1 | Survey (Spec Miner §3.2) |
| 3 | `AcademicAssignment` Schema Isolation | Add `userId String?` + relation to `User` + index on `AcademicAssignment` | M1 | Survey (Spec Miner §3.3) |
| 4 | `User` Reverse Relations | Add `appointments`, `academicSubjects`, `academicAssignments` to `User` | M1 | Survey (Spec Miner §3.4) |
| 5 | Legacy Data Safe Backfill | Backfill existing unowned subjects, assignments, and appointments to admin user | M1 | Survey (Backend §1.6, Spec Miner §1.2) |
| 6 | Academic Router `authMiddleware` | Enforce JWT authentication on all `/api/academic/*` routes | M2 | Survey (Backend §1.2, §1.4) |
| 7 | Calendar Router `authMiddleware` | Enforce JWT authentication on `/api/appointments` and `/api/calendar/events` | M2 | Survey (Backend §1.2, §1.5) |
| 8 | Academic Subject Scoping (CRUD) | Scope `listSubjects`, `createSubject`, `updateSubject`, `deleteSubject` by `userId` | M2 | Survey (Backend §1.4) |
| 9 | Academic Assignment Scoping (CRUD) | Scope `listAssignments`, `createAssignment`, `updateAssignment`, `deleteAssignment` by `userId` | M2 | Survey (Backend §1.4) |
| 10 | Appointment Scoping (CRUD) | Scope `listAppointments`, `getAppointmentById`, `createAppointment`, `updateAppointment`, `deleteAppointment` by `userId` | M2 | Survey (Backend §1.5) |
| 11 | Calendar Projection Isolation | Filter appointments and assignments by `effectiveUserId` in `getCalendarEvents()` | M2 | Survey (Backend §1.5) |
| 12 | Dashboard Projection Isolation | Ensure `/api/dashboard/overview` does not leak cross-tenant calendar events | M2 | Survey (Backend §1.5) |
| 13 | MCP Academic Tools Scoping | Pass `userId` and enforce user scoping in `academic.tools.ts` | M2 | Survey (Backend §1.4, Spec Miner §3.20-23) |
| 14 | MCP Calendar Tools Scoping | Pass `userId` and enforce user scoping in `m2.tools.ts` (`create_appointment`, `list_upcoming_deadlines`) | M2 | Survey (Backend §1.5, Spec Miner §3.24-25) |
| 15 | IDOR Prevention (404/403) | Return 404/403 on unauthorized direct access/mutation to foreign subjects/assignments/appointments | M2 | Survey (Backend §1.4, §1.5) |
| 16 | Frontend Session Reset | Key `<AppContent key={user?.id ?? 'anonymous'} />` and reset memory states on user change/logout | M3 | Survey (Frontend §1.5) |
| 17 | Frontend Error Handling & Feedback | Handle 403/404 gracefully in `AcademicView` and `CalendarView` | M3 | Survey (Frontend §1.3, §1.4) |
| 18 | Frontend Zero-Data Empty States | Ensure empty state UI renders correctly for new accounts | M3 | Survey (Frontend §4.3) |
| 19 | New Account Baseline Automated Test | Verify newly registered user sees 0 subjects, 0 assignments, 0 appointments | M4 | Survey (Spec Miner §7.1.1) |
| 20 | User Data Creation Automated Test | Verify created subjects, assignments, appointments bind to creator | M4 | Survey (Spec Miner §7.1.2) |
| 21 | Cross-Tenant Query Isolation Test | Verify User B cannot view User A's academic or calendar data | M4 | Survey (Spec Miner §7.1.3) |
| 22 | IDOR Mutation Rejection Test | Verify User B direct modification/deletion of User A's data returns 404/403 | M4 | Survey (Spec Miner §7.1.4) |
| 23 | Unauthenticated Rejection Test | Verify requests without JWT or with invalid JWT return 401 | M4 | Survey (Spec Miner §7.1.5) |
| 24 | Backfill Data Loss Prevention Test | Verify legacy records belong to primary admin and are accessible only to admin | M4 | Survey (Spec Miner §7.1.6) |
| 25 | MCP Tool Scoping Test | Verify MCP tools respect multi-user isolation | M4 | Survey (Spec Miner §7.1.7) |
| 26 | Regression Suite Verification | Verify existing tests (`verify_multi_user_isolation.ts`, `encoding-regression.test.ts`) pass | M4 | Survey (Spec Miner §7.2) |
| 27 | Full Frontend & Backend Build Check | Verify `npm run build` passes on both backend and frontend | M4 | Survey (Frontend §5.1, Backend §5.4) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data Models & Safe Migration | Prisma schema update with `userId` relations, DB push, backfill unowned records | none | DONE |
| M2 | Backend Protection & Query Filtering | Route `authMiddleware`, controller extraction of `req.user.id`, service-level scoping, IDOR prevention, MCP tool scoping | M1 | DONE |
| M3 | Frontend Context & Session Isolation | `App.tsx` clean remounting via user key, memory state reset, graceful 403/404 handling | M2 | DONE |
| M4 | Automated Isolation Tests & Final Gate | Full programmatic isolation test suite (`tests/verify_academic_calendar_isolation.ts`), multi-user verification, reviews, adversarial challenge, forensic audit | M2, M3 | DONE |

## Interface Contracts

### Backend Academic Service (`backend/src/modules/academic/academic.service.ts`)
- `listSubjects(userId: string): Promise<AcademicSubject[]>`
- `createSubject(userId: string, data: CreateSubjectDto): Promise<AcademicSubject>`
- `updateSubject(id: string, userId: string, data: UpdateSubjectDto): Promise<AcademicSubject>` (throws `NotFoundError` if not found or not owned)
- `deleteSubject(id: string, userId: string): Promise<void>` (throws `NotFoundError` if not found or not owned)
- `listAssignments(userId: string, subjectId?: string): Promise<AcademicAssignment[]>`
- `createAssignment(userId: string, data: CreateAssignmentDto): Promise<AcademicAssignment>` (verifies `subjectId` belongs to `userId`, throws `NotFoundError` otherwise)
- `updateAssignment(id: string, userId: string, data: UpdateAssignmentDto): Promise<AcademicAssignment>` (throws `NotFoundError` if not found or not owned)
- `deleteAssignment(id: string, userId: string): Promise<void>` (throws `NotFoundError` if not found or not owned)

### Backend Calendar Services (`backend/src/modules/calendar/`)
- `listAppointments(userId: string, filters: AppointmentFilters): Promise<Appointment[]>`
- `getAppointmentById(id: string, userId: string): Promise<Appointment>` (throws `NotFoundError` if not found or not owned)
- `createAppointment(userId: string, data: CreateAppointmentDto): Promise<Appointment>`
- `updateAppointment(id: string, userId: string, data: UpdateAppointmentDto): Promise<Appointment>` (throws `NotFoundError` if not found or not owned)
- `deleteAppointment(id: string, userId: string): Promise<void>` (throws `NotFoundError` if not found or not owned)
- `getCalendarEvents(filters: CalendarFilter & { userId: string }): Promise<CalendarEventProjection[]>` (filters tasks, appointments, and assignments strictly by `userId`)

### HTTP Error Status Protocol
- Missing / invalid token: `401 Unauthorized`
- Attempt to read, edit, or delete non-existent or foreign record: `404 Not Found` (preventing ID enumeration)
- Creation with invalid foreign key (e.g. subjectId of another user): `404 Not Found`

## Code Layout
- `backend/prisma/schema.prisma`: Database models (`User`, `Appointment`, `AcademicSubject`, `AcademicAssignment`)
- `backend/src/services/backfill.service.ts`: Legacy data backfill routine
- `backend/src/modules/academic/`: Router, Controller, Service for subjects and assignments
- `backend/src/modules/calendar/`: Router, Controller, Services for appointments and calendar projections
- `backend/src/modules/mcp/tools/`: MCP tools for academic and calendar modules
- `frontend/src/App.tsx`: App wrapper, session mounting and state reset
- `frontend/src/components/academic/`: Academic views and modals
- `frontend/src/components/calendar/`: Calendar views and modals
- `tests/`: Automated test suites (`verify_academic_calendar_isolation.ts`, `verify_multi_user_isolation.ts`, `verify_adversarial_edge_cases.ts`)

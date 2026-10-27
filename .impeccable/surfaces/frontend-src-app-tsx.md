---
version: 1
slug: "frontend-src-app-tsx"
primary_target: "frontend/src/App.tsx"
related_targets: ["frontend/src/components/DashboardOverviewPage.tsx","frontend/src/components/Navbar.tsx","frontend/src/components/TopHeader.tsx","frontend/src/components/ProjectList.tsx","frontend/src/components/KanbanBoard.tsx","frontend/src/components/sprint/SprintKanbanView.tsx","frontend/src/components/calendar/CalendarView.tsx","frontend/src/components/academic/AcademicView.tsx"]
---

# BrainBoard Workspace Surface Brief

- **Mode:** Operate
- **Scope:** Full BrainBoard frontend (`App.tsx`, `Navbar.tsx`, `TopHeader.tsx`, `DashboardOverviewPage.tsx`, `ProjectList.tsx`, `KanbanBoard.tsx`, `SprintKanbanView.tsx`, `CalendarView.tsx`, `AcademicView.tsx`, and modals) as the default route experience.
- **Task & Constraints:** Unify personal, academic, and project workflows in a clean 3-zone Pinterest-inspired UI (`Virtus` / `Timesheet` / `Veltrix` hybrid) while preserving discreet illustrated covers on project and academic cards, real API data, dark/light themes, ABNT2 keyboard shortcuts, and `prefers-reduced-motion`. Future metrics without backend history remain explicitly labeled `Em breve`.

## Direction contract

THESIS: BrainBoard operates as a modular 3-zone studio command ledger (`Virtus` + `Timesheet` hybrid) that pairs crisp radial/segmented progress telemetry and tabular dated task rows with discreet illustrated cover vignettes, refusing both noisy gamer-launcher clutter and generic gray SaaS card grids.
OWN-WORLD: Committed deep-indigo/slate navigation shell (`#1e1b4b` / `#0f1424`) paired with crisp alabaster/slate-900 work surfaces, 1px hairline row dividers, SVG radial progress rings, tabular date callout blocks (`26 OUT`), and 4:3 illustrated cover strips with bottom scrims; raised by `pop-culture-shelf-vertical-video-feed-surface` (scrim contrast over covers), `rw-centre-rail-reference-setting` (1px hairline row structure), `vernacular-ephemera-boarding-pass-and-gate-board` (tabular date/status callout blocks), and `wayfinding-cartography-signage-midnight-transit-diagram` (high-contrast semantic line/dot indicators).
STORY: The user immediately sees their active focus queue, real project portfolio status via radial and segmented telemetry, and upcoming 7-day deadlines in one coherent 3-zone view, stepping directly into project Kanban boards, focus queues, calendar, or academic subjects.
FIRST VIEWPORT: Left committed sidebar (navigation + quick project switcher with cover thumbnails); slim top command header (breadcrumb/context, search `Ctrl+K`, theme toggle, primary `+ Nova Tarefa` / `+ Novo Projeto` pill CTA); center primary column with a compact Radial Progress & Active Focus telemetry strip at top followed by structured "Tarefas em Foco" dated rows and discreet cover-framed Project cards; right support column with "Seus Projetos / Status" radial gauge, "Agenda · 7 Dias" dated timeline rows, and compact "Em breve" modules.
FORM: Candidate 6 on our grounded list (Modular Command Ledger & Radial Telemetry — Virtus/Timesheet Hybrid), seed key `8da3cb8a`.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

---
name: BrainBoard Studio Design System
description: Modular personal progress, project command, and academic studio ledger
colors:
  primary: "#0f172a"
  primary-dark: "#f8fafc"
  shell-light: "#1b1947"
  shell-dark: "#090d16"
  surface-light: "#ffffff"
  surface-dark: "#131b2e"
  surface-muted-light: "#f8fafd"
  surface-muted-dark: "#182238"
  page-bg-light: "#f3f5fa"
  page-bg-dark: "#0b0f19"
  border-light: "rgba(148, 163, 184, 0.28)"
  border-dark: "rgba(100, 116, 139, 0.32)"
  accent-indigo: "#4f46e5"
  accent-emerald: "#10b981"
  accent-amber: "#f59e0b"
  accent-slate: "#64748b"
typography:
  display:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.15
  headline:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Onest, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "normal"
rounded:
  inner: "8px"
  panel: "14px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.inner}"
    padding: "8px 16px"
  panel:
    backgroundColor: "{colors.surface-light}"
    rounded: "{rounded.panel}"
---

# Design System: BrainBoard Studio

## Overview

**Creative North Star: "The Modular Studio Command Ledger"**

BrainBoard is designed as a focused, high-craft productivity and academic studio operating as a Virtus + Timesheet hybrid. It pairs crisp radial/segmented progress telemetry and dated tabular task rows with discreet, original illustrated cover vignettes. It resolutely refuses both noisy gamer-launcher clutter and generic gray SaaS card grids, prioritizing quiet focus, high density, and tactile feedback.

The system unifies personal, academic, and software engineering workflows in a coherent 3-zone overview as the default route experience (`/`). Every surface is anchored by a committed deep-indigo/slate left navigation sidebar and a studio command header equipped with real-time sync, theme toggle, and ABNT2 keyboard shortcuts (`Ctrl+K`).

**Key Characteristics:**
- **Single-Border Elevation:** Flat 1px structural hairline borders (`.bb-panel`) replacing wide drop-shadow haze at rest.
- **Radial Focus Telemetry:** SVG circular progress rings and linear hairlined meters displaying genuine execution ratios.
- **Timesheet Tabular Alignment:** Monospace tabular numbers (`JetBrains Mono` / `.bb-tabular`) for counts, dates, and hours.
- **Honest Data Presentation:** Unbacked telemetry modules (`Produtividade`, `Sequência`, `Relógio`) explicitly labeled `Em breve` with zero fabricated metrics.
- **Editorial Cover Vignettes:** Discreet 4:3 illustrated covers (`getProjectCover`) anchoring project and academic subjects, with embedded AI provenance metadata on all shipped raster assets.

## Colors

The BrainBoard palette combines a deep indigo-slate navigation shell with clean alabaster/slate-900 work surfaces and high-contrast semantic studio accents.

### Primary Controls & Surfaces
- **Studio Slate / Ink** (`#0f172a` light / `#f8fafc` dark text): Primary action buttons and focal controls (`bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg`). Crisp, architectural tactile controls replacing generic saturated `#4f46e5` buttons.
- **Studio Indigo Accent** (`#6366f1` / `#818cf8`): Controlled semantic indicator for active project status tags and selected navigation highlights.

### Secondary
- **Studio Emerald** (`#10b981`): Concluded tasks, complete milestones, and healthy execution status.
- **Studio Amber** (`#f59e0b`): Warning states, active in-progress queues, and approaching due dates.
- **Studio Rose** (`#f43f5e`): Overdue items and critical alerts.

### Neutral
- **Shell Background** (`#1b1947` light / `#090d16` dark): Committed navigation rail and studio frame background.
- **Work Surface Canvas** (`#f3f5fa` light / `#0b0f19` dark): Primary page canvas backing panels.
- **Panel Surface** (`#ffffff` light / `#131b2e` dark): Foreground panel surfaces (`.bb-panel`).
- **Muted Surface** (`#f8fafd` light / `#182238` dark): Nested containers, sub-panels (`.bb-panel-muted`), and secondary items.
- **Hairline Border** (`rgba(148, 163, 184, 0.28)` light / `rgba(100, 116, 139, 0.32)` dark): Crisp 1px structural dividers.

### Named Rules
**The Single Accent Rule.** Only one primary interactive accent color is allowed per visual group. Functional colors (emerald, amber, rose) are reserved strictly for status telemetry.
**The Studio Control Rule.** Action buttons must use crisp studio slate/ink palettes (`bg-slate-900` / `dark:bg-slate-100`) with 8px radius (`rounded-lg`) and no glowing indigo shadows.

## Typography

**Display & Body Font:** `Onest` (system-ui, -apple-system, sans-serif)  
**Tabular & Code Font:** `JetBrains Mono` (ui-monospace, monospace)

**Character:** `Onest` provides an open, modern, and geometric rhythm for human-readable copy and headings, while `JetBrains Mono` provides tabular digit alignment across all counters, badges, timestamps, and progress percentages.

### Hierarchy
- **Display** (`font-extrabold`, `2.25rem` / `36px`, `line-height: 1.15`): Hero titles and major view headings.
- **Headline** (`font-bold`, `1.5rem` / `24px`, `line-height: 1.25`): Section headings and modal titles.
- **Title** (`font-semibold`, `1.125rem` / `18px`, `line-height: 1.35`): Card headers and group titles.
- **Body** (`font-normal`, `0.875rem` / `14px`, `line-height: 1.5`): Descriptions and interactive labels.
- **Tabular Label** (`JetBrains Mono`, `font-semibold`, `0.75rem` / `12px`, `.bb-tabular`): Counters, progress percentages, dates, and times.

### Named Rules
**The No Uppercase Kicker Rule.** Section headers and card titles must use clean sentence case. Never place an uppercase tracking-wider eyebrow or kicker above an `h1`, `h2`, or `h3` heading.  
**The Tabular Digit Rule.** Any numeric metric, badge counter, percentage, or date stamp must be wrapped in `.bb-tabular font-mono`.

## Layout

BrainBoard employs a committed left-sidebar shell layout:
- **Navigation Sidebar (Left, 256px / w-64 desktop):** Persistent navigation with quick project switcher, 4:3 cover thumbnails, and dark/light mode toggle. Collapses to an accessible modal drawer on mobile (`< 1024px`).
- **Top Command Header (Sticky, 56px / h-14):** Breadcrumbs, global search (`Ctrl+K`) with ABNT2 `AltGraph`/`isComposing` protection, sync indicator, and primary action buttons.
- **Main Viewport (`h-dvh flex-col lg:flex-row overflow-hidden`):** Prevents viewport blowout and maintains independent scroll containers.
- **3-Zone Overview (`/`):**
  - **Zone 1 (Top Hero):** Priority banner with ambient artwork backdrop paired with an SVG radial execution progress gauge.
  - **Zone 2 (Left Column):** Timesheet-style dated tabular task rows with date stamps (`26 OUT`), status chips, and project badges.
  - **Zone 3 (Right Column):** Project distribution radial telemetry, 7-day Agenda timeline rows, and honest `Em breve` capability modules.

## Elevation & Depth

BrainBoard is strictly flat-by-default at rest. Depth is expressed through single-border hairline contrast and tonal layering rather than soft drop shadows.

### Shadow Vocabulary
- **Resting Surface:** Zero box-shadow (`box-shadow: none`). 1px hairline border (`border: 1px solid var(--bb-border)`).
- **Interactive Hover:** Subtle elevation only on active hover states (`0 10px 25px -3px rgba(15, 23, 42, 0.08)`).
- **Modals & Overlays:** Backdrop blur with dark scrim overlay (`--bb-modal-overlay`).

### Named Rules
**The Flat-at-Rest Rule.** Panels, cards, and buttons must not cast drop-shadow haze while stationary. Elevation is indicated exclusively by 1px borders and surface tone differences.

## Shapes

- **Panels & Outer Containers:** 14px border radius (`--bb-radius-panel: 0.875rem`, `.bb-panel`).
- **Inner Containers & Cards:** 10px border radius (`--bb-radius-inner: 0.625rem`, `.bb-panel-muted`).
- **Thumbnails & Vignettes:** Discreet 4:3 aspect ratio (`w-10 h-8` or `w-16 h-12`) with rounded corners and bottom gradient scrims.
- **Action Buttons & Chips:** Rounded 10px-12px (`rounded-xl`).

## Components

### 3-Zone Overview
- **Radial Focus Gauge:** SVG circular progress meter with `stroke-dasharray` and `stroke-dashoffset` calculation, displaying execution percentage centrally and completed/total counts alongside.
- **Timesheet Dated Rows:** Tabular task execution queue where each row displays a 48px square date badge (`day` + `month`), task title, project tag, and status badge.
- **Honest "Em breve" Modules:** Informative placeholder cards for upcoming telemetry (`Produtividade`, `Sequência`, `Relógio`) without fabricated numbers.

### Buttons & Controls
- **Primary:** Studio Slate/Ink (`bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white`), 8px radius (`rounded-lg`), 1px subtle border, strictly no soft shadow.
- **Secondary:** Surface background with 1px border (`border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg`).
- **Icon Actions:** 36px-40px touch targets, accessible `aria-label`, smooth color transitions.

### Collaborators & Task Assignees
- **AvatarStack:** Overlapping avatars (`-space-x-1.5`) displaying member initials, custom avatar colors, role indicators, and `+N` indicator for team overflow.
- **ProjectCollaboratorsModal:** Accessible dialog for searching registered users, inviting team members, listing project members with roles, and managing team composition.
- **Task Assignee:** Direct avatar indicator on cards with quick-switcher popover for instant reassignment.

### Academic & Calendar Studio
- **Academic Subject Selector:** List items featuring 4:3 cover thumbnails (`getProjectCover(subject.id)`), sentence-case labels, and count badges.
- **Calendar Month Grid:** 7-column calendar cells with day numbers and compact event chips.
- **Day Agenda Rows:** Hairlined tabular rows displaying monospace start/end times (`.bb-tabular font-mono`), category tags, and inline check/delete actions.

### Asset Provenance Specification
Every shipping raster asset in `frontend/public/assets/` (`.png`, `.jpg`, `.webp`) must have embedded AI prompt and model provenance metadata, verifiable via `impeccable embed-prompt --scan frontend/public/assets`.

## Do's and Don'ts

### Do:
- **Do** wrap every numeric metric, count badge, percentage, and date string in `.bb-tabular font-mono`.
- **Do** use `.bb-panel` with 1px single-border elevation for cards, containers, and modals.
- **Do** use crisp studio slate/ink controls (`bg-slate-900` / `dark:bg-slate-100`) for primary actions.
- **Do** display unbacked capabilities (`Produtividade`, `Sequência`, `Relógio`) as honest `Em breve` items in a compact muted footer strip.
- **Do** compute donut ring meters mathematically from actual model data.
- **Do** ensure full light/dark theme parity across all screens and modals.
- **Do** guard keyboard shortcuts against ABNT2 `AltGraph` and IME composition (`event.isComposing || event.getModifierState('AltGraph')`).
- **Do** honor `prefers-reduced-motion` with `motion-reduce:transition-none` and instantaneous state changes.
- **Do** embed prompt and model metadata into all shipping raster assets.

### Don't:
- **Don't** use uppercase tracking-wider kickers or eyebrows above headings.
- **Don't** place full-bleed wallpaper imagery or glowing gradient scrims behind hero text.
- **Don't** combine 1px borders with wide, soft drop-shadow haze or glowing halos (`shadow-indigo-500/20`).
- **Don't** use repetitive icon boxes next to list items when tabular index counters (`01`, `02`...) provide clearer hierarchy.
- **Don't** use violet or fuchsia AI tell palettes for core UI elements; use studio slate/ink, neutral grays, and semantic status accents.
- **Don't** invent fake telemetry numbers or mock charts that simulate unbacked functionality.
- **Don't** copy internal design-contract prose into source code comments.

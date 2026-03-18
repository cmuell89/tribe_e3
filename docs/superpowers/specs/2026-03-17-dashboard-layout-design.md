# Dashboard Layout Design — Submitter View

**Date:** 2026-03-17
**Status:** Draft
**Branch:** feature/dashboard-design (from bfced032)

## Overview

Redesign the Intake Triage app from a flat list view to a navigation-focused dashboard with a collapsible sidebar. This spec covers the **project submitter** view. An analyst view will follow in a separate spec.

No user management or authentication is implemented — just the UI surfaces that will eventually be scoped per user type.

## Data Model Change

Add one field to the `Intake` model in `prisma/schema.prisma`:

```
approvalStatus  String  @default("submitted")  // "submitted" | "approved" | "denied"
```

- Default: `"submitted"` — every new intake starts here
- Only an analyst will change this value (future work)
- Separate from `aiStatus` which tracks the AI triage pipeline

### Migration

Run `npx prisma migrate dev --name add-approval-status` after updating the schema. Existing rows will receive the default value `"submitted"`.

### Two-Track Status Model

| Track | Field | Values | Purpose |
|-------|-------|--------|---------|
| AI Triage | `aiStatus` | pending / completed / error | Internal processing state |
| Approval | `approvalStatus` | submitted / approved / denied | Business decision outcome |

The submitter primarily cares about approval status. AI status is secondary information.

## Navigation Shell

### Collapsible Sidebar (`AppSidebar`)

Install the shadcn/ui sidebar component (`npx shadcn@latest add sidebar`) and build `AppSidebar` on top of its primitives (`SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarTrigger`).

- Dark background, left-positioned, always present
- Contains: app logo/name, navigation items, settings at bottom
- Collapses to icon-only mode via `SidebarTrigger`
- Collapsed state managed by `SidebarProvider` (persists via cookie)
- Responsive: collapses automatically below `md` breakpoint (768px)

**Nav items:**
| Item | Icon | Route | Notes |
|------|------|-------|-------|
| My Intakes | list icon | `/` | Active by default |
| New Intake | plus icon | `/intakes/new` | |
| Settings | gear icon | — | Bottom of sidebar, placeholder for future |

### Layout Structure (`SidebarLayout`)

```
┌──────────┬────────────────────────────────┐
│          │  Page Header (title + action)  │
│ Sidebar  ├────────────────────────────────┤
│          │  Page Content                  │
│          │                                │
└──────────┴────────────────────────────────┘
```

- `SidebarProvider` wraps the root `layout.tsx`
- `AppSidebar` renders alongside `{children}` inside the provider
- Main content area fills remaining width

## Submitter Dashboard (Home Page)

### Page Header

- Title: "My Intakes"
- Subtitle: "Your submitted project requests"
- Action button: "+ New Intake" (links to `/intakes/new`)

### Summary Cards (`IntakeSummaryCards`)

Four cards displayed in a horizontal row:

| Card | Color | Value |
|------|-------|-------|
| Total | Neutral | Count of all intakes |
| Submitted | Amber (#f59e0b) | Count where approvalStatus = "submitted" |
| Approved | Green (#22c55e) | Count where approvalStatus = "approved" |
| Denied | Red (#ef4444) | Count where approvalStatus = "denied" |

**Filter behavior:**
- Clicking a status card (Submitted, Approved, Denied) filters the intake list to that status
- Active card receives a highlighted visual treatment (colored border/background tint matching its status color)
- Clicking the active card again clears the filter
- Clicking "Total" clears any active filter
- Only one filter active at a time
- Filter is client-side — all intakes are fetched once, filtered in the browser
- When a filter is active but no intakes match, show a contextual empty state (e.g., "No denied intakes") rather than the global "No intakes yet" empty state

### Intake List

Displays intake cards sorted by creation date (newest first), filtered by the active summary card filter.

### Intake Cards (`IntakeCard` — updated)

Add `approvalStatus: string` to `IntakeCardProps`.

Lean card layout:

```
┌─────────────────────────────────────────────────┐
│  E-Commerce Platform Redesign      [Approved] ✓AI│
│  Retail · Mar 15, 2026                           │
└─────────────────────────────────────────────────┘
```

- **Title** — intake title, bold
- **Approval badge** (`ApprovalBadge`) — prominent, right-aligned, color-coded:
  - Submitted: amber background/text
  - Approved: green background/text
  - Denied: red background/text
- **AI status** — small secondary indicator next to approval badge:
  - `✓ AI` (muted) when aiStatus = "completed"
  - `⏳ AI` (amber) when aiStatus = "pending"
  - `✗ AI` (red) when aiStatus = "error"
- **Metadata line** — industry + formatted date, muted text
- **Click** navigates to existing detail page (`/intakes/[id]`)

## Intake Detail Page (`/intakes/[id]`)

Add the `ApprovalBadge` to the existing detail page header alongside the title. The "Back to intakes" link is removed — the sidebar provides persistent navigation.

## Component Architecture

### New Components

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `AppSidebar` | Client | `src/components/app-sidebar.tsx` | Collapsible sidebar built on shadcn sidebar primitives |
| `IntakeSummaryCards` | Client | `src/components/intake-summary-cards.tsx` | Clickable status summary cards with filter + highlight |
| `ApprovalBadge` | Server | `src/components/approval-badge.tsx` | Color-coded approval status badge |
| `ClientDashboard` | Client | `src/components/client-dashboard.tsx` | Client wrapper managing filter state |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `approvalStatus` field |
| `src/app/layout.tsx` | Wrap children in `SidebarProvider` + `AppSidebar` |
| `src/app/page.tsx` | Add summary cards, use `ClientDashboard` wrapper, pass `approvalStatus` to cards |
| `src/components/intake-card.tsx` | Add `approvalStatus` prop, render `ApprovalBadge`, secondary AI indicator |
| `src/app/intakes/[id]/page.tsx` | Add `ApprovalBadge`, remove back link |
| `src/lib/schemas.ts` | Add `intakeResponseSchema` that includes `approvalStatus` for type-safe client handling. Do NOT add to `createIntakeSchema` — approval status is server-defaulted, never user-submitted. |

### Data Flow

```
layout.tsx (server)
  └─ SidebarProvider
       ├─ AppSidebar (client — collapse state via provider)
       └─ {children}

page.tsx (server)
  └─ fetches all intakes via prisma.intake.findMany()
  └─ computes approval counts by filtering the array in JS (no additional DB queries)
       └─ ClientDashboard (client — manages filter state)
            ├─ IntakeSummaryCards (counts, activeFilter, onFilterChange)
            └─ filtered IntakeCard list
```

- Server component fetches data and computes counts via JS array filtering
- Client wrapper manages filter state
- No new API endpoints needed
- Existing `GET /api/intakes` and Prisma queries are sufficient

## Routes

No route changes. Existing routes remain:

| Route | Purpose |
|-------|---------|
| `/` | Submitter dashboard (updated layout) |
| `/intakes/new` | New intake form (now inside sidebar shell) |
| `/intakes/[id]` | Intake detail (now inside sidebar shell) |
| `/api/intakes` | API: list/create intakes |
| `/api/intakes/[id]` | API: get intake by ID |

## Out of Scope

- User authentication / management
- Analyst view (separate spec)
- Approval status mutations (analyst feature)
- Route group splitting (can be done when analyst view is designed)
- Server-side filtering / pagination (unnecessary at current scale)

## Future Considerations

- When user types are added, the sidebar nav items will differ per role
- Route groups `(submitter)` and `(analyst)` can be introduced to scope layouts
- The `approvalStatus` field will need an API endpoint for analysts to update
- Filtering may move server-side if intake counts grow significantly

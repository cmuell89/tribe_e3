# Dashboard Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible sidebar navigation shell and submitter dashboard with approval status summary cards and client-side filtering.

**Architecture:** Server components fetch data and compute counts; a client wrapper manages filter state and passes it to summary cards and the filtered intake list. The sidebar uses shadcn/ui sidebar primitives and wraps the entire app via the root layout.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui (base-nova), Prisma 7 + SQLite, Vitest, Zod

**Spec:** `docs/superpowers/specs/2026-03-17-dashboard-layout-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/app-sidebar.tsx` | Collapsible sidebar with nav items, built on shadcn sidebar primitives |
| `src/components/approval-badge.tsx` | Color-coded approval status badge (server component) |
| `src/components/intake-summary-cards.tsx` | Four clickable status cards with filter highlight state |
| `src/components/client-dashboard.tsx` | Client wrapper managing filter state, renders summary cards + filtered list |
| `src/lib/dashboard-utils.ts` | Pure functions for filtering intakes and computing approval counts |
| `__tests__/dashboard-utils.test.ts` | Tests for filter and count logic |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `approvalStatus` field |
| `src/lib/schemas.ts` | Add `approvalStatusValues` constant, `intakeResponseSchema` |
| `src/app/layout.tsx` | Wrap children in `SidebarProvider` + `AppSidebar` |
| `src/app/page.tsx` | Compute counts, render `ClientDashboard` instead of inline list |
| `src/components/intake-card.tsx` | Add `approvalStatus` prop, `ApprovalBadge`, secondary AI indicator |
| `src/app/intakes/[id]/page.tsx` | Add `ApprovalBadge`, remove back link |

---

## Task 1: Add approvalStatus to data model

**Files:**
- Modify: `prisma/schema.prisma:9-23`
- Modify: `src/lib/schemas.ts`
- Test: `__tests__/schemas.test.ts`

- [ ] **Step 1: Write failing test for approval status schema**

Add to `__tests__/schemas.test.ts`:

```typescript
import { approvalStatusValues, intakeResponseSchema } from "@/lib/schemas";

describe("approvalStatusValues", () => {
  it("contains exactly submitted, approved, denied", () => {
    expect(approvalStatusValues).toEqual(["submitted", "approved", "denied"]);
  });
});

describe("intakeResponseSchema", () => {
  it("accepts valid intake response with approvalStatus", () => {
    const result = intakeResponseSchema.safeParse({
      id: "clx123",
      title: "Test",
      description: "Desc",
      approvalStatus: "submitted",
      aiStatus: "pending",
      createdAt: "2026-03-17T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid approvalStatus", () => {
    const result = intakeResponseSchema.safeParse({
      id: "clx123",
      title: "Test",
      description: "Desc",
      approvalStatus: "invalid",
      aiStatus: "pending",
      createdAt: "2026-03-17T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/schemas.test.ts`
Expected: FAIL — `approvalStatusValues` and `intakeResponseSchema` not exported

- [ ] **Step 3: Add approvalStatus constants and response schema**

In `src/lib/schemas.ts`, add after the existing exports:

```typescript
export const approvalStatusValues = ["submitted", "approved", "denied"] as const;
export type ApprovalStatus = (typeof approvalStatusValues)[number];

export const intakeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  industry: z.string().optional(),
  approvalStatus: z.enum(approvalStatusValues),
  aiStatus: z.string(),
  createdAt: z.string(),
});

export type IntakeResponse = z.infer<typeof intakeResponseSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/schemas.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Update Prisma schema**

In `prisma/schema.prisma`, add after the `industry` field (line 16):

```prisma
  approvalStatus     String   @default("submitted")
```

- [ ] **Step 6: Run migration**

Run: `npx prisma migrate dev --name add-approval-status`
Expected: Migration created and applied. Existing rows get default value `"submitted"`.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/lib/schemas.ts __tests__/schemas.test.ts
git commit -m "feat: add approvalStatus field and response schema"
```

---

## Task 2: Install shadcn sidebar and create ApprovalBadge

**Files:**
- Install: shadcn sidebar component (adds multiple files to `src/components/ui/`)
- Create: `src/components/approval-badge.tsx`

- [ ] **Step 1: Install shadcn sidebar component**

Run: `npx shadcn@latest add sidebar`

This installs sidebar primitives (`SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarTrigger`, etc.) into `src/components/ui/sidebar.tsx`. It may also install dependencies like `@/hooks/use-mobile.tsx` and additional ui components (tooltip, separator, etc.).

Accept all prompts/overwrite defaults.

- [ ] **Step 2: Verify sidebar installed**

Run: `ls src/components/ui/sidebar.tsx`
Expected: File exists

- [ ] **Step 3: Create ApprovalBadge component**

Create `src/components/approval-badge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";

const approvalConfig: Record<string, { label: string; className: string }> = {
  submitted: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  denied: {
    label: "Denied",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function ApprovalBadge({ status }: { status: string }) {
  const config = approvalConfig[status] ?? approvalConfig.submitted;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ src/hooks/ src/components/approval-badge.tsx
git commit -m "feat: install shadcn sidebar and add ApprovalBadge component"
```

---

## Task 3: Build AppSidebar

**Files:**
- Create: `src/components/app-sidebar.tsx`

- [ ] **Step 1: Create AppSidebar component**

> **Note:** The spec calls for a dark sidebar. The shadcn sidebar supports `variant="sidebar"` which uses the `--sidebar-*` CSS variables defined in `globals.css`. Set these variables to dark values if the default isn't dark enough, or use `className="bg-sidebar"` with overridden sidebar CSS vars.

Create `src/components/app-sidebar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Plus, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "My Intakes", href: "/", icon: ClipboardList },
  { title: "New Intake", href: "/intakes/new", icon: Plus },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            IT
          </div>
          <span className="font-semibold text-sm">Intake Triage</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npx next build 2>&1 | tail -20` (or `npx tsc --noEmit`)
Expected: No type errors related to AppSidebar

- [ ] **Step 3: Commit**

```bash
git add src/components/app-sidebar.tsx
git commit -m "feat: add AppSidebar with nav items"
```

---

## Task 4: Wire sidebar into root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx to include sidebar**

Replace the contents of `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Intake Triage",
  description: "Internal tool for triaging project intake requests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-12 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
            </header>
            <main className="flex-1 bg-background">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify app loads with sidebar**

Run: `npx next dev` and visit `http://localhost:3000`
Expected: Sidebar visible on left with "Intake Triage" header, "My Intakes" and "New Intake" nav items. Collapse toggle works. Page content renders in the main area.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wire sidebar into root layout"
```

---

## Task 5: Update IntakeCard with approval badge and AI indicator

**Files:**
- Modify: `src/components/intake-card.tsx`

- [ ] **Step 1: Rewrite IntakeCard**

Replace `src/components/intake-card.tsx` with:

```tsx
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ApprovalBadge } from "@/components/approval-badge";

interface IntakeCardProps {
  id: string;
  title: string;
  industry: string;
  createdAt: string;
  aiStatus: string;
  approvalStatus: string;
}

function AiStatusIndicator({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <span className="text-xs text-muted-foreground" title="AI triage complete">✓ AI</span>;
    case "pending":
      return <span className="text-xs text-amber-600" title="AI triage pending">⏳ AI</span>;
    case "error":
      return <span className="text-xs text-red-600" title="AI triage error">✗ AI</span>;
    default:
      return null;
  }
}

export function IntakeCard({
  id,
  title,
  industry,
  createdAt,
  aiStatus,
  approvalStatus,
}: IntakeCardProps) {
  return (
    <Link href={`/intakes/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <ApprovalBadge status={approvalStatus} />
            <AiStatusIndicator status={aiStatus} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {industry && <span>{industry}</span>}
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/intake-card.tsx
git commit -m "feat: update IntakeCard with ApprovalBadge and AI indicator"
```

---

## Task 6: Build dashboard utilities, IntakeSummaryCards, and ClientDashboard

**Files:**
- Create: `src/lib/dashboard-utils.ts`
- Create: `src/components/intake-summary-cards.tsx`
- Create: `src/components/client-dashboard.tsx`
- Test: `__tests__/dashboard-utils.test.ts`

- [ ] **Step 1: Write failing tests for filter and count logic**

Create `__tests__/dashboard-utils.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { filterIntakes, computeApprovalCounts } from "@/lib/dashboard-utils";

describe("filterIntakes", () => {
  const intakes = [
    { approvalStatus: "submitted" },
    { approvalStatus: "submitted" },
    { approvalStatus: "approved" },
    { approvalStatus: "denied" },
  ];

  it("returns all intakes when filter is null", () => {
    expect(filterIntakes(intakes, null)).toHaveLength(4);
  });

  it("filters by submitted", () => {
    expect(filterIntakes(intakes, "submitted")).toHaveLength(2);
  });

  it("filters by approved", () => {
    expect(filterIntakes(intakes, "approved")).toHaveLength(1);
  });

  it("filters by denied", () => {
    expect(filterIntakes(intakes, "denied")).toHaveLength(1);
  });

  it("returns empty array for no matches", () => {
    const allSubmitted = [{ approvalStatus: "submitted" }];
    expect(filterIntakes(allSubmitted, "denied")).toHaveLength(0);
  });
});

describe("computeApprovalCounts", () => {
  it("computes correct counts", () => {
    const intakes = [
      { approvalStatus: "submitted" },
      { approvalStatus: "submitted" },
      { approvalStatus: "approved" },
      { approvalStatus: "denied" },
    ];
    expect(computeApprovalCounts(intakes)).toEqual({
      total: 4,
      submitted: 2,
      approved: 1,
      denied: 1,
    });
  });

  it("handles empty array", () => {
    expect(computeApprovalCounts([])).toEqual({
      total: 0,
      submitted: 0,
      approved: 0,
      denied: 0,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/dashboard-utils.test.ts`
Expected: FAIL — `filterIntakes` and `computeApprovalCounts` not found

- [ ] **Step 3: Create dashboard-utils.ts**

Create `src/lib/dashboard-utils.ts`:

```typescript
interface HasApprovalStatus {
  approvalStatus: string;
}

export function filterIntakes<T extends HasApprovalStatus>(
  intakes: T[],
  filter: string | null
): T[] {
  if (!filter) return intakes;
  return intakes.filter((i) => i.approvalStatus === filter);
}

export function computeApprovalCounts(intakes: HasApprovalStatus[]) {
  return {
    total: intakes.length,
    submitted: intakes.filter((i) => i.approvalStatus === "submitted").length,
    approved: intakes.filter((i) => i.approvalStatus === "approved").length,
    denied: intakes.filter((i) => i.approvalStatus === "denied").length,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/dashboard-utils.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Create IntakeSummaryCards**

Create `src/components/intake-summary-cards.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  label: string;
  count: number;
  colorClass: string;
  activeColorClass: string;
  filterValue: string | null;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

function SummaryCard({
  label,
  count,
  colorClass,
  activeColorClass,
  filterValue,
  activeFilter,
  onFilterChange,
}: SummaryCardProps) {
  const isActive = activeFilter === filterValue;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isActive && activeColorClass
      )}
      onClick={() => onFilterChange(isActive ? null : filterValue)}
    >
      <CardContent className="pt-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {label}
        </div>
        <div className={cn("text-2xl font-bold", colorClass)}>{count}</div>
      </CardContent>
    </Card>
  );
}

interface IntakeSummaryCardsProps {
  counts: {
    total: number;
    submitted: number;
    approved: number;
    denied: number;
  };
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export function IntakeSummaryCards({
  counts,
  activeFilter,
  onFilterChange,
}: IntakeSummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <SummaryCard
        label="Total"
        count={counts.total}
        colorClass="text-foreground"
        activeColorClass="ring-2 ring-foreground/20"
        filterValue={null}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <SummaryCard
        label="Submitted"
        count={counts.submitted}
        colorClass="text-amber-600"
        activeColorClass="ring-2 ring-amber-500/40 bg-amber-50 dark:bg-amber-950/20"
        filterValue="submitted"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <SummaryCard
        label="Approved"
        count={counts.approved}
        colorClass="text-green-600"
        activeColorClass="ring-2 ring-green-500/40 bg-green-50 dark:bg-green-950/20"
        filterValue="approved"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <SummaryCard
        label="Denied"
        count={counts.denied}
        colorClass="text-red-600"
        activeColorClass="ring-2 ring-red-500/40 bg-red-50 dark:bg-red-950/20"
        filterValue="denied"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}
```

- [ ] **Step 6: Create ClientDashboard**

Create `src/components/client-dashboard.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { IntakeSummaryCards } from "@/components/intake-summary-cards";
import { IntakeCard } from "@/components/intake-card";
import { filterIntakes, computeApprovalCounts } from "@/lib/dashboard-utils";

interface IntakeData {
  id: string;
  title: string;
  industry: string;
  createdAt: string;
  aiStatus: string;
  approvalStatus: string;
}

interface ClientDashboardProps {
  intakes: IntakeData[];
}

export function ClientDashboard({ intakes }: ClientDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const counts = useMemo(() => computeApprovalCounts(intakes), [intakes]);

  const filteredIntakes = useMemo(
    () => filterIntakes(intakes, activeFilter),
    [intakes, activeFilter]
  );

  return (
    <>
      <IntakeSummaryCards
        counts={counts}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div className="mt-6 space-y-3">
        {filteredIntakes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">
              {activeFilter
                ? `No ${activeFilter} intakes`
                : <>No intakes yet — <Link href="/intakes/new" className="underline">create your first one</Link></>}
            </p>
          </div>
        ) : (
          filteredIntakes.map((intake) => (
            <IntakeCard
              key={intake.id}
              id={intake.id}
              title={intake.title}
              industry={intake.industry}
              createdAt={intake.createdAt}
              aiStatus={intake.aiStatus}
              approvalStatus={intake.approvalStatus}
            />
          ))
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/dashboard-utils.ts src/components/intake-summary-cards.tsx src/components/client-dashboard.tsx __tests__/dashboard-utils.test.ts
git commit -m "feat: add IntakeSummaryCards and ClientDashboard with filter logic"
```

---

## Task 7: Wire up the home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Rewrite page.tsx to use ClientDashboard**

Replace `src/app/page.tsx` with:

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ClientDashboard } from "@/components/client-dashboard";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const intakes = await prisma.intake.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serializedIntakes = intakes.map((intake) => ({
    id: intake.id,
    title: intake.title,
    industry: intake.industry,
    createdAt: intake.createdAt.toISOString(),
    aiStatus: intake.aiStatus,
    approvalStatus: intake.approvalStatus,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Intakes</h1>
          <p className="text-sm text-muted-foreground">
            Your submitted project requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/intakes/export" download>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </a>
          <Link href="/intakes/new">
            <Button>+ New Intake</Button>
          </Link>
        </div>
      </div>

      <ClientDashboard intakes={serializedIntakes} />
    </div>
  );
}
```

- [ ] **Step 2: Verify app loads and dashboard works**

Run: `npx next dev` and visit `http://localhost:3000`
Expected:
- Summary cards visible with counts
- Clicking a status card filters the list
- Active card shows highlight
- Clicking again clears filter
- Empty filter state shows "No {status} intakes"

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire ClientDashboard into home page"
```

---

## Task 8: Update detail page with ApprovalBadge

**Files:**
- Modify: `src/app/intakes/[id]/page.tsx`

- [ ] **Step 1: Update intake detail page**

In `src/app/intakes/[id]/page.tsx`, make these changes:

1. Add import for `ApprovalBadge`:
```tsx
import { ApprovalBadge } from "@/components/approval-badge";
```

2. Replace the top section that contains the "Back to intakes" link and "Export CSV" button. Remove the back link (sidebar provides navigation) but **preserve the Export CSV button**. Replace the `<div className="flex items-center justify-between mb-6">...</div>` block with just the Export CSV button:
```tsx
      <div className="flex justify-end mb-6">
        <a href={`/api/intakes/${intake.id}/export`} download>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </a>
      </div>
```

3. Update the `CardHeader` to include the approval badge:
```tsx
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{intake.title}</CardTitle>
          <ApprovalBadge status={intake.approvalStatus} />
        </CardHeader>
```

4. Remove the unused `Link` import (no longer needed). Keep `Button` and `Download` imports for the Export CSV button.

- [ ] **Step 2: Verify detail page renders**

Run: `npx next dev`, create or view an existing intake at `/intakes/[id]`
Expected: Approval badge visible in card header. Export CSV button present. No back link. Sidebar provides navigation.

- [ ] **Step 3: Commit**

```bash
git add src/app/intakes/[id]/page.tsx
git commit -m "feat: add ApprovalBadge to detail page, remove back link, preserve CSV export"
```

---

## Task 9: Run full test suite and final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Verify full user flow**

Run: `npx next dev` and test:
1. Sidebar visible on all pages, collapses/expands
2. "My Intakes" nav link goes to `/`, shows as active
3. "New Intake" nav link goes to `/intakes/new`
4. Summary cards show correct counts
5. Clicking a status card filters the list, highlights the card
6. Clicking again clears the filter
7. Clicking an intake card navigates to detail page
8. Detail page shows approval badge, no back link
9. Detail page "Export CSV" button still works (downloads single intake CSV)
10. Home page "Export CSV" button still works (downloads bulk CSV)
11. Sidebar navigation works from detail page back to list

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues from final verification"
```

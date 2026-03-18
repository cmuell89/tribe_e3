# CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSV export capability so users can download intake data as CSV files from both the list page (bulk) and detail page (single).

**Architecture:** Two new API route handlers (`/api/intakes/export` and `/api/intakes/[id]/export`) generate CSV server-side using a shared utility module. Frontend adds download buttons using plain `<a>` tags pointed at these endpoints.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (SQLite), Vitest, shadcn/ui, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-17-csv-export-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/lib/csv.ts` | CSV utility functions (escaping, formatting, conversion) |
| Create | `__tests__/csv.test.ts` | Unit tests for CSV utility |
| Create | `src/app/api/intakes/export/route.ts` | Bulk export API endpoint |
| Create | `src/app/api/intakes/[id]/export/route.ts` | Single intake export API endpoint |
| Create | `__tests__/api/intakes-export.test.ts` | Tests for bulk export endpoint |
| Create | `__tests__/api/intakes-id-export.test.ts` | Tests for single intake export endpoint |
| Modify | `src/app/page.tsx` | Add "Export CSV" button to list page |
| Modify | `src/app/intakes/[id]/page.tsx` | Add "Export CSV" button to detail page |

---

### Task 1: CSV Utility — `escapeCSVField`

**Files:**
- Create: `__tests__/csv.test.ts`
- Create: `src/lib/csv.ts`

- [ ] **Step 1: Write failing tests for `escapeCSVField`**

```typescript
// __tests__/csv.test.ts
import { describe, it, expect } from "vitest";
import { escapeCSVField } from "@/lib/csv";

describe("escapeCSVField", () => {
  it("returns plain string unchanged", () => {
    expect(escapeCSVField("hello")).toBe("hello");
  });

  it("wraps field containing comma in double quotes", () => {
    expect(escapeCSVField("hello, world")).toBe('"hello, world"');
  });

  it("wraps field containing newline in double quotes", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("escapes internal double quotes by doubling them", () => {
    expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""');
  });

  it("handles field with comma and quotes together", () => {
    expect(escapeCSVField('a "b", c')).toBe('"a ""b"", c"');
  });

  it("returns empty string for null", () => {
    expect(escapeCSVField(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeCSVField(undefined)).toBe("");
  });

  it("wraps field containing carriage return in double quotes", () => {
    expect(escapeCSVField("line1\rline2")).toBe('"line1\rline2"');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/csv.test.ts`
Expected: FAIL — module `@/lib/csv` not found

- [ ] **Step 3: Implement `escapeCSVField`**

```typescript
// src/lib/csv.ts

export function escapeCSVField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/csv.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts __tests__/csv.test.ts
git commit -m "feat: add escapeCSVField CSV utility with tests"
```

---

### Task 2: CSV Utility — `parseJSONArray` and `intakesToCSV`

**Files:**
- Modify: `__tests__/csv.test.ts`
- Modify: `src/lib/csv.ts`

- [ ] **Step 1: Write failing tests for `parseJSONArray`**

Update the import in `__tests__/csv.test.ts` to include the new functions, then append test cases:

```typescript
// Update existing import line to:
import { escapeCSVField, parseJSONArray, intakesToCSV } from "@/lib/csv";

describe("parseJSONArray", () => {
  it("parses valid JSON array to comma-separated string", () => {
    expect(parseJSONArray('["a","b","c"]')).toBe("a, b, c");
  });

  it("returns empty string for null", () => {
    expect(parseJSONArray(null)).toBe("");
  });

  it("returns empty string for invalid JSON", () => {
    expect(parseJSONArray("not json")).toBe("");
  });

  it("returns empty string for non-array JSON", () => {
    expect(parseJSONArray('{"a": 1}')).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/csv.test.ts`
Expected: FAIL — `parseJSONArray` is not exported

- [ ] **Step 3: Implement `parseJSONArray`**

Add to `src/lib/csv.ts`:

```typescript
export function parseJSONArray(value: string | null | undefined): string {
  if (value == null) return "";
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return "";
    return parsed.join(", ");
  } catch {
    return "";
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/csv.test.ts`
Expected: All 12 tests PASS

- [ ] **Step 5: Write failing tests for `intakesToCSV`**

Append to `__tests__/csv.test.ts`:

```typescript
describe("intakesToCSV", () => {
  const baseIntake = {
    id: "abc123",
    title: "Test Intake",
    description: "A test description",
    budgetRange: "10k-50k",
    timeline: "Q1 2026",
    industry: "Tech",
    createdAt: new Date("2026-01-15T10:30:00.000Z"),
    aiStatus: "completed",
    aiSummary: "This is a summary",
    aiTags: '["tag1","tag2","tag3"]',
    aiRiskChecklist: '["risk1","risk2"]',
    aiValueProposition: "High value project",
    aiError: null,
  };

  it("produces header row plus data row", () => {
    const csv = intakesToCSV([baseIntake]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "id,title,description,budget_range,timeline,industry,created_at,ai_status,ai_summary,ai_tags,ai_risk_checklist,ai_value_proposition"
    );
    expect(lines[1]).toContain("abc123");
    expect(lines[1]).toContain("Test Intake");
  });

  it("flattens aiTags JSON array to comma-separated", () => {
    const csv = intakesToCSV([baseIntake]);
    const lines = csv.split("\n");
    expect(lines[1]).toContain('"tag1, tag2, tag3"');
  });

  it("renders null AI fields as empty cells", () => {
    const pending = {
      ...baseIntake,
      aiStatus: "pending",
      aiSummary: null,
      aiTags: null,
      aiRiskChecklist: null,
      aiValueProposition: null,
    };
    const csv = intakesToCSV([pending]);
    const lines = csv.split("\n");
    // Should end with consecutive commas for empty fields
    expect(lines[1]).toContain("pending,,,,");
  });

  it("returns header-only CSV for empty array", () => {
    const csv = intakesToCSV([]);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("id,title");
  });

  it("escapes description containing commas and quotes", () => {
    const tricky = {
      ...baseIntake,
      description: 'He said "hello, world"',
    };
    const csv = intakesToCSV([tricky]);
    expect(csv).toContain('"He said ""hello, world"""');
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run __tests__/csv.test.ts`
Expected: FAIL — `intakesToCSV` is not exported

- [ ] **Step 7: Implement `intakesToCSV`**

Add to `src/lib/csv.ts`:

```typescript
import type { Intake } from "@prisma/client";

const CSV_HEADERS = [
  "id",
  "title",
  "description",
  "budget_range",
  "timeline",
  "industry",
  "created_at",
  "ai_status",
  "ai_summary",
  "ai_tags",
  "ai_risk_checklist",
  "ai_value_proposition",
] as const;

function intakeToRow(intake: Intake): string {
  const fields = [
    intake.id,
    intake.title,
    intake.description,
    intake.budgetRange,
    intake.timeline,
    intake.industry,
    intake.createdAt instanceof Date
      ? intake.createdAt.toISOString()
      : String(intake.createdAt),
    intake.aiStatus,
    intake.aiSummary,
    parseJSONArray(intake.aiTags),
    parseJSONArray(intake.aiRiskChecklist),
    intake.aiValueProposition,
  ];
  return fields.map(escapeCSVField).join(",");
}

export function intakesToCSV(intakes: Intake[]): string {
  const header = CSV_HEADERS.join(",");
  const rows = intakes.map(intakeToRow);
  return [header, ...rows].join("\n");
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run __tests__/csv.test.ts`
Expected: All 17 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/csv.ts __tests__/csv.test.ts
git commit -m "feat: add parseJSONArray and intakesToCSV utilities with tests"
```

---

### Task 3: Bulk Export API Endpoint

**Files:**
- Create: `__tests__/api/intakes-export.test.ts`
- Create: `src/app/api/intakes/export/route.ts`

- [ ] **Step 1: Write failing tests for `GET /api/intakes/export`**

```typescript
// __tests__/api/intakes-export.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/intakes/export/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.intake.findMany);

describe("GET /api/intakes/export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns CSV with correct content-type and disposition headers", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const response = await GET();

    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="intakes-export-\d{4}-\d{2}-\d{2}\.csv"$/
    );
  });

  it("queries only completed intakes ordered by createdAt desc", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { aiStatus: "completed" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns header-only CSV when no completed intakes exist", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const response = await GET();
    const text = await response.text();
    const lines = text.trim().split("\n");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("id,title");
  });

  it("returns CSV with data rows for completed intakes", async () => {
    const intakes = [
      {
        id: "abc",
        title: "Test",
        description: "Desc",
        budgetRange: "10k",
        timeline: "Q1",
        industry: "Tech",
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
        aiStatus: "completed",
        aiSummary: "Summary",
        aiTags: '["a","b"]',
        aiRiskChecklist: '["r1"]',
        aiValueProposition: "Value",
        aiError: null,
      },
    ];
    mockFindMany.mockResolvedValueOnce(intakes as never);

    const response = await GET();
    const text = await response.text();
    const lines = text.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("abc");
    expect(lines[1]).toContain("Test");
  });

  it("returns 500 on database error", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB fail"));

    const response = await GET();
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to export");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/api/intakes-export.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement bulk export route**

```typescript
// src/app/api/intakes/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { intakesToCSV } from "@/lib/csv";

export async function GET() {
  try {
    const intakes = await prisma.intake.findMany({
      where: { aiStatus: "completed" },
      orderBy: { createdAt: "desc" },
    });

    const csv = intakesToCSV(intakes);
    const date = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="intakes-export-${date}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/api/intakes-export.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/intakes/export/route.ts __tests__/api/intakes-export.test.ts
git commit -m "feat: add bulk CSV export API endpoint"
```

---

### Task 4: Single Intake Export API Endpoint

**Files:**
- Create: `__tests__/api/intakes-id-export.test.ts`
- Create: `src/app/api/intakes/[id]/export/route.ts`

- [ ] **Step 1: Write failing tests for `GET /api/intakes/[id]/export`**

```typescript
// __tests__/api/intakes-id-export.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/intakes/[id]/export/route";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.intake.findUnique);

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/intakes/[id]/export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when intake not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost"), makeParams("missing"));
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Intake not found");
  });

  it("returns CSV with correct headers for existing intake", async () => {
    const intake = {
      id: "abc",
      title: "My Intake",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      aiStatus: "completed",
      aiSummary: "Summary",
      aiTags: '["a"]',
      aiRiskChecklist: '["r1"]',
      aiValueProposition: "Value",
      aiError: null,
    };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const response = await GET(new Request("http://localhost"), makeParams("abc"));

    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="intake-my-intake\.csv"$/
    );
  });

  it("returns CSV with header and one data row", async () => {
    const intake = {
      id: "abc",
      title: "Test",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      aiStatus: "completed",
      aiSummary: "Summary",
      aiTags: '["a"]',
      aiRiskChecklist: '["r1"]',
      aiValueProposition: "Value",
      aiError: null,
    };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const response = await GET(new Request("http://localhost"), makeParams("abc"));
    const text = await response.text();
    const lines = text.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("id,title");
    expect(lines[1]).toContain("abc");
  });

  it("works for intake with pending AI status (null AI fields)", async () => {
    const intake = {
      id: "abc",
      title: "Pending",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      aiStatus: "pending",
      aiSummary: null,
      aiTags: null,
      aiRiskChecklist: null,
      aiValueProposition: null,
      aiError: null,
    };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const response = await GET(new Request("http://localhost"), makeParams("abc"));
    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toContain("pending");
  });

  it("returns 500 on database error", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("DB fail"));

    const response = await GET(new Request("http://localhost"), makeParams("abc"));
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to export");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/api/intakes-id-export.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement single intake export route**

```typescript
// src/app/api/intakes/[id]/export/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { intakesToCSV } from "@/lib/csv";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const intake = await prisma.intake.findUnique({ where: { id } });

    if (!intake) {
      return NextResponse.json({ error: "Intake not found" }, { status: 404 });
    }

    const csv = intakesToCSV([intake]);
    const slug = slugify(intake.title);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="intake-${slug}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/api/intakes-id-export.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/intakes/[id]/export/route.ts __tests__/api/intakes-id-export.test.ts
git commit -m "feat: add single intake CSV export API endpoint"
```

---

### Task 5: Add Export Button to List Page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add Export CSV button to the list page header**

In `src/app/page.tsx`, add the Download icon import and an export button next to "New Intake":

```tsx
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { IntakeCard } from "@/components/intake-card";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const intakes = await prisma.intake.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Intakes</h1>
        <div className="flex items-center gap-2">
          <a href="/api/intakes/export" download>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </a>
          <Link href="/intakes/new">
            <Button>New Intake</Button>
          </Link>
        </div>
      </div>

      {intakes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">
            No intakes yet —{" "}
            <Link href="/intakes/new" className="underline">
              create your first one
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {intakes.map((intake) => (
            <IntakeCard
              key={intake.id}
              id={intake.id}
              title={intake.title}
              industry={intake.industry}
              createdAt={intake.createdAt.toISOString()}
              aiStatus={intake.aiStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the dev server renders correctly**

Run: `npx next build` (or check dev server manually)
Expected: No build errors

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add Export CSV button to intake list page"
```

---

### Task 6: Add Export Button to Detail Page

**Files:**
- Modify: `src/app/intakes/[id]/page.tsx`

- [ ] **Step 1: Add Export CSV button to the detail page**

In `src/app/intakes/[id]/page.tsx`, add the Download icon import and an export button after the back link:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiTriagePanel } from "@/components/ai-triage-panel";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const intake = await prisma.intake.findUnique({ where: { id } });

  if (!intake) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to intakes
        </Link>
        <a href={`/api/intakes/${intake.id}/export`} download>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </a>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{intake.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{intake.description}</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Budget:</span>{" "}
              {intake.budgetRange || "—"}
            </div>
            <div>
              <span className="font-medium">Timeline:</span>{" "}
              {intake.timeline || "—"}
            </div>
            <div>
              <span className="font-medium">Industry:</span>{" "}
              {intake.industry || "—"}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {new Date(intake.createdAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <AiTriagePanel
        intake={{
          id: intake.id,
          aiStatus: intake.aiStatus,
          aiSummary: intake.aiSummary,
          aiTags: intake.aiTags,
          aiRiskChecklist: intake.aiRiskChecklist,
          aiValueProposition: intake.aiValueProposition,
          aiError: intake.aiError,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify the dev server renders correctly**

Run: `npx next build` (or check dev server manually)
Expected: No build errors

- [ ] **Step 3: Commit**

```bash
git add src/app/intakes/[id]/page.tsx
git commit -m "feat: add Export CSV button to intake detail page"
```

---

### Task 7: Run Full Test Suite

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new CSV tests)

- [ ] **Step 2: Run build**

Run: `npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address test/build issues from CSV export feature"
```

(Skip this step if no fixes were needed.)

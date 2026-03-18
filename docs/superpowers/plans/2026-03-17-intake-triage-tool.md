# Intake Triage Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an internal intake triage tool where users create project requests and an AI generates triage analysis (summary, tags, risks, value proposition) asynchronously.

**Architecture:** Next.js App Router with three pages (list, create, detail). API route handlers for CRUD. Fire-and-forget async AI processing via Claude SDK structured output. Client-side polling on detail page until AI completes.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma + SQLite, shadcn/ui + Tailwind CSS, @anthropic-ai/sdk with Zod structured output

**Spec:** `docs/superpowers/specs/2026-03-17-intake-triage-tool-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with font + global styles
│   ├── page.tsx                # Intake list page (server component)
│   ├── intakes/
│   │   ├── new/
│   │   │   └── page.tsx        # Create intake page
│   │   └── [id]/
│   │       └── page.tsx        # Intake detail page (server component, delegates to client)
│   └── api/
│       └── intakes/
│           ├── route.ts        # GET (list) + POST (create + fire AI)
│           └── [id]/
│               └── route.ts    # GET (single intake for polling)
├── components/
│   ├── intake-card.tsx         # Card component for list view
│   ├── intake-form.tsx         # Create intake form (client component)
│   └── ai-triage-panel.tsx     # AI results panel with pending/completed/error states
└── lib/
    ├── db.ts                   # Prisma client singleton
    ├── ai.ts                   # Claude API call with structured output + retry
    └── schemas.ts              # Zod schemas (form validation + AI output)
prisma/
└── schema.prisma               # Intake model
__tests__/
├── schemas.test.ts             # Schema validation tests
├── ai.test.ts                  # AI retry logic tests (mocked SDK)
└── api/
    ├── intakes.test.ts         # List + create API tests
    └── intakes-id.test.ts      # Single intake API tests
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/lib/utils.ts`, `components.json`

- [ ] **Step 1: Initialize Next.js project**

Note: The repo already has files (`.gitignore`, `docs/`, `.env`). Move them aside, scaffold, then restore:

```bash
mv .gitignore .gitignore.bak && mv docs docs.bak && mv .env .env.bak && mv README.md README.md.bak
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
mv .gitignore.bak .gitignore && mv docs.bak docs && mv .env.bak .env && mv README.md.bak README.md
```

Expected: Project scaffolded with `src/app/` structure, Tailwind configured, existing files preserved.

- [ ] **Step 2: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Expected: `components.json` created, `src/lib/utils.ts` generated with `cn` helper.

- [ ] **Step 3: Add shadcn components we'll need**

Run:
```bash
npx shadcn@latest add button card input label textarea badge skeleton
```

Expected: Components added under `src/components/ui/`.

- [ ] **Step 4: Verify dev server starts**

Run:
```bash
npm run dev
```

Expected: Server starts on `http://localhost:3000`, default Next.js page renders.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs src/ components.json .gitignore public/ next-env.d.ts eslint.config.mjs
git commit -m "feat: scaffold Next.js project with shadcn/ui and Tailwind"
```

---

### Task 2: Database Setup with Prisma

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`
- Modify: `package.json` (add prisma deps)

- [ ] **Step 1: Install Prisma dependencies**

Run:
```bash
npm install prisma @prisma/client --save
```

- [ ] **Step 2: Initialize Prisma with SQLite**

Run:
```bash
npx prisma init --datasource-provider sqlite
```

Expected: `prisma/schema.prisma` created with SQLite datasource. `.env` updated with `DATABASE_URL`.

- [ ] **Step 3: Define the Intake model**

Write `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Intake {
  id                 String   @id @default(cuid())
  title              String
  description        String
  budgetRange        String   @default("")
  timeline           String   @default("")
  industry           String   @default("")
  createdAt          DateTime @default(now())
  aiStatus           String   @default("pending")
  aiSummary          String?
  aiTags             String?
  aiRiskChecklist    String?
  aiValueProposition String?
  aiError            String?
}
```

- [ ] **Step 4: Run initial migration**

Run:
```bash
npx prisma migrate dev --name init
```

Expected: Migration created in `prisma/migrations/`, SQLite database file created.

- [ ] **Step 5: Create Prisma client singleton**

Write `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

This prevents multiple Prisma Client instances during Next.js hot reload.

- [ ] **Step 6: Verify Prisma Studio works**

Run:
```bash
npx prisma studio
```

Expected: Opens browser with Intake table visible (empty).

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/lib/db.ts package.json package-lock.json
git commit -m "feat: add Prisma with SQLite and Intake model"
```

---

### Task 3: Test Infrastructure Setup

**Files:**
- Create: `vitest.config.ts`, `__tests__/setup.ts`
- Modify: `package.json` (add vitest, test script)

- [ ] **Step 1: Install Vitest and testing utilities**

Run:
```bash
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: Create Vitest config**

Write `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create test setup file**

Write `__tests__/setup.ts`:

```typescript
// Global test setup
// Add any shared test utilities or mocks here
```

- [ ] **Step 4: Add test script to package.json**

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Verify Vitest runs (no tests yet)**

Run:
```bash
npm test
```

Expected: Vitest runs successfully with "No test files found" or similar.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts __tests__/setup.ts package.json package-lock.json
git commit -m "feat: add Vitest test infrastructure"
```

---

### Task 4: Zod Schemas (TDD)

**Files:**
- Create: `src/lib/schemas.ts`, `__tests__/schemas.test.ts`
- Modify: `package.json` (add zod)

- [ ] **Step 1: Install Zod**

Run:
```bash
npm install zod
```

- [ ] **Step 2: Write failing tests for schemas**

Write `__tests__/schemas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createIntakeSchema, triageOutputSchema } from "@/lib/schemas";

describe("createIntakeSchema", () => {
  it("accepts valid full input", () => {
    const result = createIntakeSchema.safeParse({
      title: "Test Project",
      description: "A test project description",
      budgetRange: "$10k-$50k",
      timeline: "Q2 2026",
      industry: "Healthcare",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with only required fields", () => {
    const result = createIntakeSchema.safeParse({
      title: "Test",
      description: "Description",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgetRange).toBe("");
      expect(result.data.timeline).toBe("");
      expect(result.data.industry).toBe("");
    }
  });

  it("rejects empty title", () => {
    const result = createIntakeSchema.safeParse({
      title: "",
      description: "Valid description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = createIntakeSchema.safeParse({
      title: "Valid title",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 characters", () => {
    const result = createIntakeSchema.safeParse({
      title: "a".repeat(201),
      description: "Valid description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = createIntakeSchema.safeParse({
      description: "Valid description",
    });
    expect(result.success).toBe(false);
  });
});

describe("triageOutputSchema", () => {
  it("accepts valid triage output", () => {
    const result = triageOutputSchema.safeParse({
      summary: "This is a summary.",
      tags: ["tag1", "tag2", "tag3"],
      riskChecklist: ["risk1", "risk2", "risk3"],
      valueProposition: "This project has strong value.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong number of tags", () => {
    const result = triageOutputSchema.safeParse({
      summary: "Summary.",
      tags: ["tag1", "tag2"],
      riskChecklist: ["risk1", "risk2", "risk3"],
      valueProposition: "Value prop.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too few risk items", () => {
    const result = triageOutputSchema.safeParse({
      summary: "Summary.",
      tags: ["tag1", "tag2", "tag3"],
      riskChecklist: ["risk1", "risk2"],
      valueProposition: "Value prop.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many risk items", () => {
    const result = triageOutputSchema.safeParse({
      summary: "Summary.",
      tags: ["tag1", "tag2", "tag3"],
      riskChecklist: ["r1", "r2", "r3", "r4", "r5", "r6"],
      valueProposition: "Value prop.",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
npm test
```

Expected: FAIL — `Cannot find module '@/lib/schemas'`

- [ ] **Step 4: Implement schemas**

Write `src/lib/schemas.ts`:

```typescript
import { z } from "zod";

// Form validation schema for creating an intake
export const createIntakeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(5000),
  budgetRange: z.string().max(100).optional().default(""),
  timeline: z.string().max(100).optional().default(""),
  industry: z.string().max(100).optional().default(""),
});

export type CreateIntakeInput = z.infer<typeof createIntakeSchema>;

// AI structured output schema
export const triageOutputSchema = z.object({
  summary: z.string().describe("2-3 sentence summary of the project intake"),
  tags: z.array(z.string()).length(3).describe("Exactly 3 relevant tags"),
  riskChecklist: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("3-5 risk items as short bullet points"),
  valueProposition: z
    .string()
    .describe(
      "2-3 sentences evaluating value relative to budget, timeline, and industry"
    ),
});

export type TriageOutput = z.infer<typeof triageOutputSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
npm test
```

Expected: All schema tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts __tests__/schemas.test.ts package.json package-lock.json
git commit -m "feat: add Zod schemas for intake validation and AI output with tests"
```

---

### Task 5: AI Integration (TDD — Claude Structured Output + Retry)

**Files:**
- Create: `src/lib/ai.ts`, `__tests__/ai.test.ts`
- Modify: `package.json` (add anthropic sdk)

- [ ] **Step 1: Install Anthropic SDK**

Run:
```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Write failing tests for AI retry logic**

Write `__tests__/ai.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK before importing ai.ts
vi.mock("@anthropic-ai/sdk", () => {
  const APIError = class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  };

  const mockParse = vi.fn();

  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { parse: mockParse },
    })),
    APIError,
    __mockParse: mockParse,
  };
});

vi.mock("@anthropic-ai/sdk/helpers/zod", () => ({
  zodOutputFormat: vi.fn().mockReturnValue({ type: "json_schema" }),
}));

import { generateTriage } from "@/lib/ai";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mockParse: mockParse, APIError } = await import("@anthropic-ai/sdk") as any;

const validIntake = {
  title: "Test Project",
  description: "Test description",
  budgetRange: "$10k",
  timeline: "Q2 2026",
  industry: "Tech",
};

const validResponse = {
  parsed_output: {
    summary: "A test summary.",
    tags: ["tag1", "tag2", "tag3"],
    riskChecklist: ["risk1", "risk2", "risk3"],
    valueProposition: "Good value.",
  },
};

describe("generateTriage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("returns parsed output on success", async () => {
    mockParse.mockResolvedValueOnce(validResponse);
    const result = await generateTriage(validIntake);
    expect(result).toEqual(validResponse.parsed_output);
    expect(mockParse).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 error and succeeds", async () => {
    mockParse
      .mockRejectedValueOnce(new APIError("Server error", 500))
      .mockResolvedValueOnce(validResponse);

    const promise = generateTriage(validIntake);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual(validResponse.parsed_output);
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 rate limit and succeeds", async () => {
    mockParse
      .mockRejectedValueOnce(new APIError("Rate limited", 429))
      .mockResolvedValueOnce(validResponse);

    const promise = generateTriage(validIntake);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual(validResponse.parsed_output);
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400 client error", async () => {
    mockParse.mockRejectedValueOnce(new APIError("Bad request", 400));

    await expect(generateTriage(validIntake)).rejects.toThrow("Bad request");
    expect(mockParse).toHaveBeenCalledTimes(1);
  });

  it("throws after 3 failed retries", async () => {
    mockParse
      .mockRejectedValueOnce(new APIError("Error", 500))
      .mockRejectedValueOnce(new APIError("Error", 500))
      .mockRejectedValueOnce(new APIError("Error", 500));

    const promise = generateTriage(validIntake);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);

    await expect(promise).rejects.toThrow("Error");
    expect(mockParse).toHaveBeenCalledTimes(3);
  });

  it("throws when parsed_output is null", async () => {
    mockParse.mockResolvedValueOnce({ parsed_output: null });

    await expect(generateTriage(validIntake)).rejects.toThrow(
      "No parsed output returned from Claude"
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:
```bash
npm test
```

Expected: FAIL — `Cannot find module '@/lib/ai'`

- [ ] **Step 4: Implement AI module with retry logic**

Write `src/lib/ai.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { triageOutputSchema, type TriageOutput } from "./schemas";

const client = new Anthropic();

const RETRY_DELAYS = [0, 1000, 3000];

interface IntakeFields {
  title: string;
  description: string;
  budgetRange: string;
  timeline: string;
  industry: string;
}

function buildPrompt(intake: IntakeFields): string {
  return [
    `Analyze this project intake:`,
    `- Title: ${intake.title}`,
    `- Description: ${intake.description}`,
    `- Budget: ${intake.budgetRange || "Not specified"}`,
    `- Timeline: ${intake.timeline || "Not specified"}`,
    `- Industry: ${intake.industry || "Not specified"}`,
  ].join("\n");
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return error.status >= 500 || error.status === 429;
  }
  if (error instanceof Error && error.message.includes("fetch")) {
    return true;
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateTriage(intake: IntakeFields): Promise<TriageOutput> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (RETRY_DELAYS[attempt] > 0) {
      await sleep(RETRY_DELAYS[attempt]);
    }

    try {
      const message = await client.messages.parse({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system:
          "You are a project intake triage assistant. Analyze the project request and produce a triage analysis.",
        messages: [{ role: "user", content: buildPrompt(intake) }],
        output_config: {
          format: zodOutputFormat(triageOutputSchema),
        },
      });

      if (!message.parsed_output) {
        throw new Error("No parsed output returned from Claude");
      }

      return message.parsed_output;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === RETRY_DELAYS.length - 1) {
        break;
      }
    }
  }

  throw lastError;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
npm test
```

Expected: All AI tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai.ts __tests__/ai.test.ts package.json package-lock.json
git commit -m "feat: add Claude AI integration with structured output, retry, and tests"
```

---

### Task 6: API Route Handlers (TDD)

**Files:**
- Create: `src/app/api/intakes/route.ts`, `src/app/api/intakes/[id]/route.ts`, `__tests__/api/intakes.test.ts`, `__tests__/api/intakes-id.test.ts`

- [ ] **Step 1: Write failing tests for API routes**

Write `__tests__/api/intakes.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai", () => ({
  generateTriage: vi.fn(),
}));

import { GET, POST } from "@/app/api/intakes/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.intake.findMany);
const mockCreate = vi.mocked(prisma.intake.create);

describe("GET /api/intakes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all intakes sorted by createdAt desc", async () => {
    const intakes = [
      { id: "1", title: "First", createdAt: new Date() },
      { id: "2", title: "Second", createdAt: new Date() },
    ];
    mockFindMany.mockResolvedValueOnce(intakes as never);

    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(2);
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no intakes exist", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual([]);
  });
});

describe("POST /api/intakes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates intake and returns 201", async () => {
    const created = {
      id: "abc123",
      title: "Test",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      aiStatus: "pending",
      createdAt: new Date(),
    };
    mockCreate.mockResolvedValueOnce(created as never);

    const request = new Request("http://localhost/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", description: "Desc" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBe("abc123");
    expect(data.aiStatus).toBe("pending");
  });

  it("returns 400 for missing required fields", async () => {
    const request = new Request("http://localhost/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

Write `__tests__/api/intakes-id.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/intakes/[id]/route";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.intake.findUnique);

describe("GET /api/intakes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns intake when found", async () => {
    const intake = { id: "abc123", title: "Test", aiStatus: "completed" };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const request = new Request("http://localhost/api/intakes/abc123");
    const response = await GET(request, {
      params: Promise.resolve({ id: "abc123" }),
    });
    const data = await response.json();

    expect(data.id).toBe("abc123");
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "abc123" } });
  });

  it("returns 404 when intake not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/intakes/nonexistent");
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npm test
```

Expected: FAIL — `Cannot find module '@/app/api/intakes/route'`

- [ ] **Step 3: Create the list + create route handler**

Write `src/app/api/intakes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createIntakeSchema } from "@/lib/schemas";
import { generateTriage } from "@/lib/ai";

export async function GET() {
  const intakes = await prisma.intake.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(intakes);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const intake = await prisma.intake.create({
    data: {
      ...parsed.data,
      aiStatus: "pending",
    },
  });

  // Fire-and-forget: do NOT await this
  processAiTriage(intake.id, parsed.data);

  return NextResponse.json(intake, { status: 201 });
}

async function processAiTriage(
  intakeId: string,
  fields: {
    title: string;
    description: string;
    budgetRange: string;
    timeline: string;
    industry: string;
  }
) {
  try {
    const triage = await generateTriage(fields);
    await prisma.intake.update({
      where: { id: intakeId },
      data: {
        aiStatus: "completed",
        aiSummary: triage.summary,
        aiTags: JSON.stringify(triage.tags),
        aiRiskChecklist: JSON.stringify(triage.riskChecklist),
        aiValueProposition: triage.valueProposition,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI processing error";
    await prisma.intake.update({
      where: { id: intakeId },
      data: {
        aiStatus: "error",
        aiError: message,
      },
    });
  }
}
```

- [ ] **Step 2: Create the single intake route handler**

Write `src/app/api/intakes/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const intake = await prisma.intake.findUnique({
    where: { id },
  });

  if (!intake) {
    return NextResponse.json({ error: "Intake not found" }, { status: 404 });
  }

  return NextResponse.json(intake);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
npm test
```

Expected: All API route tests PASS.

- [ ] **Step 6: Test API with curl (manual integration test)**

Start dev server, then in another terminal:

```bash
# Create an intake
curl -X POST http://localhost:3000/api/intakes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","description":"A test project for validation","budgetRange":"$10k-$50k","timeline":"Q2 2026","industry":"Technology"}'

# List intakes
curl http://localhost:3000/api/intakes

# Get single intake (replace ID from create response)
curl http://localhost:3000/api/intakes/<id>
```

Expected: Intake created with `aiStatus: "pending"`, then after a few seconds polling the single endpoint shows `aiStatus: "completed"` with AI fields populated.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/ __tests__/api/
git commit -m "feat: add API route handlers for intake list, create, and get with tests"
```

---

### Task 7: Intake List Page (Empty + Populated States)

**Files:**
- Create: `src/components/intake-card.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the IntakeCard component**

Write `src/components/intake-card.tsx`:

```typescript
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IntakeCardProps {
  id: string;
  title: string;
  industry: string;
  createdAt: string;
  aiStatus: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  completed: "default",
  error: "destructive",
};

export function IntakeCard({
  id,
  title,
  industry,
  createdAt,
  aiStatus,
}: IntakeCardProps) {
  return (
    <Link href={`/intakes/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant={statusVariant[aiStatus] ?? "secondary"}>
            {aiStatus}
          </Badge>
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

- [ ] **Step 2: Build the list page with empty state**

Write `src/app/page.tsx`:

```typescript
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { IntakeCard } from "@/components/intake-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const intakes = await prisma.intake.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Intakes</h1>
        <Link href="/intakes/new">
          <Button>New Intake</Button>
        </Link>
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

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000`. Expected: Empty state message "No intakes yet — Create your first one" with a link and a "New Intake" button.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/intake-card.tsx
git commit -m "feat: add intake list page with empty state and intake card component"
```

---

### Task 8: Create Intake Form

**Files:**
- Create: `src/components/intake-form.tsx`, `src/app/intakes/new/page.tsx`

- [ ] **Step 1: Create the IntakeForm client component**

Write `src/components/intake-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function IntakeForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      budgetRange: formData.get("budgetRange") as string,
      timeline: formData.get("timeline") as string,
      industry: formData.get("industry") as string,
    };

    try {
      const res = await fetch("/api/intakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create intake");
      }

      const intake = await res.json();
      router.push(`/intakes/${intake.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Intake</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="Project name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              required
              maxLength={5000}
              rows={4}
              placeholder="Describe the project..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budgetRange">Budget Range</Label>
              <Input
                id="budgetRange"
                name="budgetRange"
                maxLength={100}
                placeholder="e.g. $10k-$50k"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Timeline</Label>
              <Input
                id="timeline"
                name="timeline"
                maxLength={100}
                placeholder="e.g. Q2 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                maxLength={100}
                placeholder="e.g. Healthcare"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Intake"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the new intake page**

Write `src/app/intakes/new/page.tsx`:

```typescript
import Link from "next/link";
import { IntakeForm } from "@/components/intake-form";

export default function NewIntakePage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to intakes
        </Link>
      </div>
      <IntakeForm />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/intakes/new`. Expected: Form renders with all fields, required indicators on title/description, submit button says "Create Intake".

- [ ] **Step 4: Commit**

```bash
git add src/components/intake-form.tsx src/app/intakes/
git commit -m "feat: add create intake form with validation and loading state"
```

---

### Task 9: Intake Detail Page with AI Triage Panel + Polling

**Files:**
- Create: `src/components/ai-triage-panel.tsx`, `src/app/intakes/[id]/page.tsx`

- [ ] **Step 1: Create the AiTriagePanel client component**

Write `src/components/ai-triage-panel.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Intake {
  id: string;
  aiStatus: string;
  aiSummary: string | null;
  aiTags: string | null;
  aiRiskChecklist: string | null;
  aiValueProposition: string | null;
  aiError: string | null;
}

export function AiTriagePanel({ intake: initial }: { intake: Intake }) {
  const [intake, setIntake] = useState(initial);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (intake.aiStatus !== "pending") return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount >= 30) {
        setTimedOut(true);
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/intakes/${intake.id}`);
        if (res.ok) {
          const updated = await res.json();
          setIntake(updated);
          if (updated.aiStatus !== "pending") {
            clearInterval(interval);
          }
        }
      } catch {
        // Silently retry on network errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [intake.id, intake.aiStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Triage Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {intake.aiStatus === "pending" && !timedOut && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generating triage analysis...
            </p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {timedOut && (
          <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
            Triage generation timed out. Please refresh the page to check again.
          </div>
        )}

        {intake.aiStatus === "error" && (
          <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
            <p className="font-medium mb-1">Triage generation failed</p>
            <p>{intake.aiError || "An unknown error occurred."}</p>
          </div>
        )}

        {intake.aiStatus === "completed" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-1">Summary</h3>
              <p className="text-sm text-muted-foreground">
                {intake.aiSummary}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Tags</h3>
              <div className="flex gap-2 flex-wrap">
                {intake.aiTags &&
                  (JSON.parse(intake.aiTags) as string[]).map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Risk Checklist</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {intake.aiRiskChecklist &&
                  (JSON.parse(intake.aiRiskChecklist) as string[]).map(
                    (risk) => <li key={risk}>{risk}</li>
                  )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Value Proposition</h3>
              <p className="text-sm text-muted-foreground">
                {intake.aiValueProposition}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create the detail page**

Write `src/app/intakes/[id]/page.tsx`:

```typescript
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiTriagePanel } from "@/components/ai-triage-panel";

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
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to intakes
        </Link>
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

- [ ] **Step 3: End-to-end test in browser**

1. Go to `http://localhost:3000` — see empty state
2. Click "New Intake" — fill in the form, submit
3. Redirected to detail page — see skeleton loading for AI triage
4. After a few seconds — AI triage populates with summary, tags, risks, value proposition
5. Click back — see the intake in the list with "completed" badge

- [ ] **Step 4: Commit**

```bash
git add src/components/ai-triage-panel.tsx src/app/intakes/
git commit -m "feat: add intake detail page with AI triage panel and polling"
```

---

### Task 10: Layout Polish and Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root layout**

Modify `src/app/layout.tsx` to include a clean layout wrapper. Keep the default font setup from create-next-app, just ensure the body has proper styling:

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Intake Triage",
  description: "Internal tool for triaging project intake requests",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-background">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Full end-to-end walkthrough**

Test the complete flow:
1. Empty list page
2. Create intake with all fields
3. Watch AI triage load
4. Verify tags, summary, risk checklist, value proposition all render
5. Navigate back to list, verify card appears

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: update root layout with app title and clean styling"
```

---

### Task 11: Error State Testing

**Files:** No new files — testing only

- [ ] **Step 1: Test form validation**

Go to `/intakes/new`, try submitting with empty title and description. Expected: HTML5 required validation prevents submission.

- [ ] **Step 2: Test API validation**

```bash
curl -X POST http://localhost:3000/api/intakes \
  -H "Content-Type: application/json" \
  -d '{"title":"","description":""}'
```

Expected: 400 response with validation error details.

- [ ] **Step 3: Test 404 for missing intake**

Navigate to `http://localhost:3000/intakes/nonexistent-id`. Expected: Next.js 404 page.

- [ ] **Step 4: Test AI error state (optional manual test)**

Temporarily set an invalid API key in `.env`, create an intake, observe the error state in the AI triage panel. Restore the valid key after testing.

- [ ] **Step 5: Commit any fixes**

If any bugs were found and fixed during testing, stage only the changed files:

```bash
git add <specific files that were fixed>
git commit -m "fix: address issues found during error state testing"
```

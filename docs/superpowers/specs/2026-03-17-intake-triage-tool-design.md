# Intake Triage Tool — Design Spec

## Overview

A small internal tool that helps triage inbound project requests quickly and consistently. Built as a thin horizontal slice covering frontend, backend API, persistence, AI analysis, UX states, and reproducibility (Docker).

**Stack:** Next.js App Router + Prisma + SQLite + Anthropic Claude (structured output) + TypeScript + Tailwind CSS

**Architecture:** Server Actions with inline AI — intake creation persists to SQLite, calls Claude for structured analysis, and stores results in a single round-trip.

## Data Model

Single `Intake` table in SQLite via Prisma:

```
Intake
├── id                  String   @id @default(cuid())
├── title               String
├── description         String
├── budgetRange         String
├── timeline            String
├── industry            String
├── createdAt           DateTime @default(now())
│
│ — AI-generated fields (nullable until populated) —
├── summary             String?       // 2-3 sentence summary
├── tags                String?       // JSON array: ["tag1","tag2","tag3"]
├── riskChecklist       String?       // JSON array of bullet strings
├── valuePropositions   String?       // JSON array of 3 value props
├── aiStatus            String   @default("pending")  // "pending" | "completed" | "failed"
├── aiError             String?       // error message if AI call failed
```

JSON arrays stored as strings (Prisma doesn't support native JSON on SQLite). Parsed/serialized in the application layer.

`aiStatus` enables the UI to distinguish between pending, completed, and failed AI states.

## Project Structure

```
tribe_e3/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Intake list view (home)
│   │   ├── intakes/
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create intake form
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Intake detail view
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Dashboard (counts by tag/status)
│   │   └── api/
│   │       └── intakes/
│   │           ├── route.ts        # GET /api/intakes (list + CSV export)
│   │           └── [id]/
│   │               └── route.ts    # GET /api/intakes/:id
│   ├── actions/
│   │   └── intakes.ts              # Server Actions: createIntake, retryAi
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── ai.ts                   # Claude API call + retry logic
│   │   └── ai-schema.ts           # Zod schema for AI JSON response
│   ├── components/
│   │   ├── intake-form.tsx         # Create form (client component)
│   │   ├── intake-list.tsx         # List with empty/loading/error states
│   │   ├── intake-detail.tsx       # Detail view with AI results
│   │   ├── ai-results.tsx          # Summary, tags, risk, value props display
│   │   ├── dashboard-charts.tsx    # Tag/status counts
│   │   ├── loading-skeleton.tsx    # Reusable loading skeleton
│   │   └── error-boundary.tsx      # Error UI component
│   └── types/
│       └── intake.ts               # Shared TypeScript types
├── __tests__/
│   ├── actions/
│   │   └── intakes.test.ts         # Server action tests
│   ├── lib/
│   │   └── ai.test.ts              # AI call tests (mocked)
│   └── components/
│       └── intake-form.test.tsx    # Form component tests
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── next.config.ts
└── .env.local                      # ANTHROPIC_API_KEY
```

**Key decisions:**
- Server Actions in `src/actions/` (not inline in pages) for testability and reuse
- Route Handlers only for read operations (list/CSV export, detail). Writes go through Server Actions.
- AI logic isolated in `src/lib/` — schema and API call are separate for independent testing
- Tests in `__tests__/` mirroring src structure

## AI Integration

### Structured Output

Single call to Claude on intake creation. Anthropic SDK tool_use with a JSON schema for reliable structured output.

**Zod schema:**

```typescript
{
  summary: string,            // 2-3 sentences
  tags: string[],             // exactly 3
  riskChecklist: string[],    // 3-6 bullet items
  valuePropositions: string[] // exactly 3
}
```

### Prompt Design

- **System prompt:** Act as a project triage analyst
- **User message:** Includes title, description, budget range, timeline, and industry
- Value propositions are tailored using the industry, description, budget, and timeline context

### Reliability

- **3 retries** with exponential backoff on transient failures (rate limits, network errors)
- **Zod validation** on every response — malformed responses trigger a retry
- **Fallback on exhaustion:** Mark `aiStatus: "failed"`, store error in `aiError`. UI shows error state with "Retry" button calling `retryAi` server action.
- **Timeout:** 30s per attempt
- **Guardrails:** Max token limit on response; truncate oversized description input before sending

## Frontend & UX States

### Intake List (home page `/`)

- Table/card list showing title, industry, tags, aiStatus, createdAt
- **Loading:** Skeleton rows while server component fetches
- **Empty:** Friendly message + prominent "Create your first intake" CTA
- **Error:** Error boundary catches fetch failures, shows message + retry

### Create Intake (`/intakes/new`)

- Form fields: title, description, budget range, timeline, industry
- Client-side validation (required fields) before submission
- Submit calls `createIntake` server action
- **Loading:** Button shows spinner + "Creating & analyzing..." (~2-5s during AI call — natural, genuine loading state)
- **Error:** If AI fails, still redirects to detail page — intake is persisted, AI section shows failed state with retry option

### Intake Detail (`/intakes/[id]`)

- All intake fields + AI results in distinct cards:
  - Summary (text block)
  - Tags (pill badges)
  - Risk checklist (bullet list)
  - Value propositions (numbered list)
- **AI failed state:** Alert banner + "Retry AI Analysis" button
- **AI pending state:** Loading skeleton (handled gracefully as fallback)
- **Error:** 404 page if intake not found

### Dashboard (`/dashboard`)

- Counts by tag
- Counts by aiStatus (completed/failed/pending)
- CSV export button — hits `GET /api/intakes?format=csv`

### Navigation

Simple top nav: Home (list), Dashboard. Create button prominent on list page.

### Styling

Tailwind CSS — clean, functional. Focused on clarity and empathy over visual polish.

## Testing Strategy

**Tooling:** Vitest + React Testing Library

### Unit tests (`src/lib/`)

- `ai.test.ts` — Mock Anthropic SDK. Test: structured output parsing via Zod, retries on transient errors, fallback to failed status after exhausting retries, oversized input truncation
- Zod schema validation with edge cases (missing fields, wrong types, extra fields)

### Server Action tests (`src/actions/`)

- `intakes.test.ts` — Mock Prisma and AI module. Test: `createIntake` persists intake + AI results on success, persists with `aiStatus: "failed"` on AI failure, `retryAi` updates existing intake, validation rejects incomplete form data

### Component tests (`src/components/`)

- `intake-form.test.tsx` — Form validation, submission behavior, loading state during submit

## Docker

### Dockerfile

Multi-stage build:
1. **deps stage** — install node_modules
2. **build stage** — `prisma generate` + `next build`
3. **run stage** — minimal image with standalone Next.js output, SQLite on a mounted volume

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=file:/data/dev.db
    volumes:
      - db-data:/data
volumes:
  db-data:
```

`next.config.ts` sets `output: "standalone"` for minimal production build.

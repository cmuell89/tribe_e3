# Intake Triage Tool — Design Spec

## Overview

A small internal tool that helps triage inbound project requests quickly and consistently. Users create intake requests via a form, and an AI assistant automatically generates a triage analysis (summary, tags, risk checklist, value proposition).

## Stack

- **Framework:** Next.js App Router (TypeScript)
- **Database:** SQLite via Prisma
- **Styling:** shadcn/ui + Tailwind CSS
- **AI:** Claude Sonnet via Anthropic SDK (`@anthropic-ai/sdk`)
- **Async pattern:** Fire-and-forget in POST route handler, client-side polling

## Data Model

Single `Intake` table:

| Field              | Type     | Notes                                                        |
| ------------------ | -------- | ------------------------------------------------------------ |
| `id`               | String   | Primary key (cuid)                                           |
| `title`            | String   | Required                                                     |
| `description`      | String   | Required                                                     |
| `budgetRange`      | String   | e.g. "$10k-$50k"                                             |
| `timeline`         | String   | e.g. "Q2 2026"                                               |
| `industry`         | String   | e.g. "Healthcare"                                            |
| `createdAt`        | DateTime | Auto-set                                                     |
| `aiStatus`         | String   | `pending` \| `completed` \| `error`                          |
| `aiSummary`        | String?  | 2-3 sentence summary                                         |
| `aiTags`           | String?  | JSON-serialized string array (3 tags)                        |
| `aiRiskChecklist`  | String?  | JSON-serialized string array (3-5 risk items)                |
| `aiValueProposition` | String? | 2-3 sentences on value relative to budget/timeline/industry |
| `aiError`          | String?  | Error message if AI processing fails                         |

`aiTags` and `aiRiskChecklist` are stored as JSON strings to keep the schema flat (no join tables).

## API Routes

| Method | Path                | Purpose                                          |
| ------ | ------------------- | ------------------------------------------------ |
| `GET`  | `/api/intakes`      | List all intakes, sorted by `createdAt` desc     |
| `GET`  | `/api/intakes/[id]` | Get single intake (used for polling AI status)   |
| `POST` | `/api/intakes`      | Create intake, fire-and-forget AI processing     |

### POST `/api/intakes` Flow

1. Validate required fields (title, description). Budget range, timeline, and industry are optional.
2. Create intake in DB with `aiStatus: "pending"`
3. Return the intake immediately (201 Created)
4. In a detached async function (no `await`):
   - Call Claude API with intake fields
   - Parse structured JSON response
   - Update DB with AI fields + `aiStatus: "completed"`
   - On failure after retries: set `aiStatus: "error"` + store error in `aiError`

## Frontend Pages

| Route            | Page          | Description                                                            |
| ---------------- | ------------- | ---------------------------------------------------------------------- |
| `/`              | Intake List   | Cards for all intakes, sorted newest first. Empty state when none.     |
| `/intakes/new`   | Create Intake | Form with all intake fields. Redirects to detail page on submit.       |
| `/intakes/[id]`  | Intake Detail | Shows intake fields + AI triage panel. Polls until AI status resolves. |

### Key Components

- **IntakeCard** — list view card showing title, industry, created date, AI status badge
- **IntakeForm** — creation form with validation and loading state on submit button
- **AiTriagePanel** — AI results section on detail page with three states:
  - *Pending:* skeleton/spinner with "Generating triage..."
  - *Completed:* summary, tags as badges, risk checklist as bullets, value proposition
  - *Error:* error message with explanation

### UX States

- **Loading:** submit button spinner during form submission; skeleton loader on AI triage panel while pending
- **Empty:** list page shows "No intakes yet — create your first one" when no intakes exist
- **Error:** AI failure displayed in detail view triage panel; form validation errors inline; API errors shown as banner/toast

## AI Integration

### Prompt

```
System: You are a project intake triage assistant. Analyze the project request and return JSON.

User: Analyze this project intake:
- Title: {title}
- Description: {description}
- Budget: {budgetRange}
- Timeline: {timeline}
- Industry: {industry}

Return JSON with:
- summary (2-3 sentences)
- tags (array of exactly 3 strings)
- riskChecklist (array of 3-5 risk items as strings)
- valueProposition (2-3 sentences evaluating the value relative to budget, timeline, and industry context)
```

### Model

Claude Sonnet — fast, cost-effective, capable of structured output.

### Retry Logic

3 attempts with exponential backoff:

- Attempt 1: immediate
- Attempt 2: wait 1 second
- Attempt 3: wait 3 seconds

Retries on:
- Network errors / timeouts
- Claude API 5xx errors
- JSON parse failures

After 3 failures: set `aiStatus: "error"`, store last error message in `aiError`.

## Polling Mechanism

Client-side polling on the detail page:

- Poll `GET /api/intakes/[id]` every **2 seconds** when `aiStatus` is `"pending"`
- Stop polling when `aiStatus` is `"completed"` or `"error"`
- Cap at **30 polls (60 seconds)** — show timeout message if still pending
- Implemented via `useEffect` + `setInterval`, with cleanup on unmount

## Out of Scope

- Edit / delete intakes
- Authentication
- Deployment / Docker
- Tests (bonus if time allows)

# Intake Triage Tool

## A) How to Run

### Prerequisites

- **Node.js >= 22** (verified with v24)
- **npm >= 9**
- A **Claude API key** from [Anthropic](https://console.anthropic.com/)

### Install & configure

```bash
npm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
DATABASE_URL="file:./dev.db"
```

### Start the app

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open **http://localhost:3001**.

### Docker alternative

```bash
docker compose up --build    # runs on port 3001
docker compose down          # stop
docker compose down -v       # stop + delete database
```

Docker Compose reads `.env` automatically. The SQLite database is persisted in a named volume.

---

## B) What You Built

- **AI-powered intake triage tool** — submit project intake requests and get automatic AI analysis via Claude, including a summary, tags, risk checklist, and value proposition.
- **Full create → list → detail flow** — submit an intake on `/intakes/new`, see all intakes on the dashboard (`/`), click through to `/intakes/[id]` for details and AI triage results.
- **AI feature behavior** — on submission, the API returns immediately (fire-and-forget). The client polls every 2 seconds until the AI triage completes. Claude generates: a 2–3 sentence summary, exactly 3 tags, 3–5 risk items, and a value proposition. Uses Anthropic structured output with Zod for guaranteed typed JSON.
- **UX states** — loading (skeleton placeholders while AI processes), empty (prompt to create first intake), error (displays AI error message), timeout (after 60s of polling). Dashboard summary cards filter by approval status (submitted/approved/denied).
- **CSV export** — bulk export of all completed intakes, or single-intake export with slugified filename. Server-side generation.

---

## C) Verification

### Automated tests

```bash
npm test
```

8 test files covering:

| Test file | What it covers |
|-----------|---------------|
| `csv.test.ts` | CSV escaping, JSON parsing, full CSV generation |
| `schemas.test.ts` | Zod input validation |
| `ai.test.ts` | AI generation (mocked Claude responses) |
| `dashboard-utils.test.ts` | Filtering and count calculations |
| `api/intakes.test.ts` | GET/POST `/api/intakes` |
| `api/intakes-id.test.ts` | GET `/api/intakes/[id]` |
| `api/intakes-export.test.ts` | Bulk CSV export |
| `api/intakes-id-export.test.ts` | Single intake CSV export |

### Manual verification checklist

- [x] Create an intake with all fields → redirects to detail page
- [x] AI triage panel shows skeleton loaders → populates with summary, tags, risks, value prop
- [x] Dashboard lists intakes, summary cards show correct counts
- [x] Click summary cards to filter by approval status
- [x] Empty state shows "no intakes" prompt with link to create
- [x] CSV export downloads with correct headers and escaped content
- [x] AI error state displays error message (tested by temporarily using invalid API key)
- [x] Polling stops on completion, error, or timeout

# Decisions

Key decisions made during the Intake Triage Tool coding exercise.

---
## Initial Application Design
- **Next.js App Router + TypeScript** — Full-stack in one project with type safety across frontend and API routes.
- **SQLite via Prisma** — Zero-infrastructure database, good fit for a local exercise.
- **Flat JSON strings for AI arrays** — Tags and risk items stored as JSON strings in one table instead of separate join tables. Keeps the schema simple.
- **Fire-and-forget AI + polling** — POST returns immediately, client polls every 2s for AI results. Simpler than WebSockets for this scope.
- **Structured output with Zod** — Anthropic SDK structured output guarantees typed JSON from Claude, no manual parsing needed.
- **Claude Sonnet** — Fast and cost-effective for the triage task.
- **shadcn/ui + Tailwind** — Accessible components with utility-class styling for rapid UI development.
- **No auth, no edit/delete, no tests** — Kept scope tight for the exercise. Tests are a stretch goal.

## CSV Feature
- **Server-side CSV generation** — CSV is built on the server in API route handlers, not in the browser. Avoids shipping CSV logic to the client and keeps export behavior consistent.
- **Hand-rolled CSV utilities instead of a library** — `escapeCSVField`, `parseJSONArray`, and `intakesToCSV` in `src/lib/csv.ts`. The format is simple enough that a dependency wasn't warranted; unit tests cover escaping edge cases.
- **JSON array columns flattened to comma-separated strings** — AI tags and risk checklist items (stored as JSON strings in SQLite) are parsed and joined so each intake stays on one CSV row.
- **Two export endpoints** — Bulk (`/api/intakes/export`) exports all completed intakes; single (`/api/intakes/[id]/export`) exports one intake with a slugified title in the filename.
- **Bulk export filters to completed intakes only** — Intakes still pending AI triage are excluded so the export reflects finalized data.
- **Export triggered via buttons on list and detail pages** — Simple anchor-style download; no client-side fetch or blob handling needed since the browser handles the `Content-Disposition: attachment` header natively.

## Adopting TweakCN Color Theme and Dashboard Layout Design

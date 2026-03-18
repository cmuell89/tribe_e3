# Decisions

Key decisions made during the Intake Triage Tool coding exercise.

---

- **Next.js App Router + TypeScript** — Full-stack in one project with type safety across frontend and API routes.
- **SQLite via Prisma** — Zero-infrastructure database, good fit for a local exercise.
- **Flat JSON strings for AI arrays** — Tags and risk items stored as JSON strings in one table instead of separate join tables. Keeps the schema simple.
- **Fire-and-forget AI + polling** — POST returns immediately, client polls every 2s for AI results. Simpler than WebSockets for this scope.
- **Structured output with Zod** — Anthropic SDK structured output guarantees typed JSON from Claude, no manual parsing needed.
- **Claude Sonnet** — Fast and cost-effective for the triage task.
- **shadcn/ui + Tailwind** — Accessible components with utility-class styling for rapid UI development.
- **No auth, no edit/delete, no tests** — Kept scope tight for the exercise. Tests are a stretch goal.

# Decisions
Dictated but cleaned up with AI.

## Plan

- Next.js full-stack app, SQLite for zero-infra setup, Claude for AI triage
- Core flow: create intake → list on dashboard → detail page with AI results
- Stretch: CSV export, dashboard filtering, polished submitter view

## Key Decisions

- Went with Next.js App Router + TypeScript — one project, one deploy, type safety end to end.
- SQLite via Prisma — no database server to set up. Prisma makes it easy to swap to Postgres later if needed.
- Fire-and-forget AI — the POST comes back immediately, then the client polls every 2s. Way simpler than WebSockets for a single-user app. 60s timeout so it doesn't poll forever.
- Structured output with Zod — this was the big win. Anthropic's SDK lets you pass a Zod schema and you get typed JSON back. No parsing, no retries on malformed output. Just works.
- Two separate status columns — `aiStatus` tracks whether Claude has finished, `approvalStatus` tracks the business decision. Kept them independent so they don't step on each other.
- Server-side CSV — built in the API route, browser downloads it natively. No client-side blob handling.
- Hand-rolled CSV utils — simple enough that a library wasn't worth it. Wrote tests for the escaping edge cases instead.
- shadcn/ui + Tailwind — fast way to get a polished UI without fighting CSS.

## How I Verified

- 8 Vitest test files covering CSV utils, validation schemas, AI generation (mocked), dashboard logic, and all API endpoints.
- Manually walked through the full flow — created intakes, watched the AI triage populate, exported CSVs, tested error states with a bad API key.

## Tradeoffs

- No auth — single-user exercise, didn't want to burn time on login flows.
- No edit/delete — create + read was the core ask. CRUD is straightforward to add.
- No WebSockets — polling works fine at this scale. Would switch for multi-user.
- No analyst view — the approval model is there (submitted/approved/denied) but only the submitter view exists. Analyst approval UI is the obvious next feature.
- No pagination — fetching everything and filtering client-side. Fine for dozens of intakes.

## What I Learned

- Structured output with Zod eliminated an entire class of bugs. Using this pattern everywhere going forward.
- Fire-and-forget + skeleton loaders is a surprisingly good UX. The content just appears.
- Defining the Prisma schema and Zod schemas first made everything downstream click into place fast.

## If I Had 1 More Day

- Analyst view with approve/deny actions and bulk operations
- Edit and resubmit — update an intake and re-trigger AI triage
- Replace polling with SSE for real-time updates
- Server-side search and pagination
- Playwright E2E tests for the full flow

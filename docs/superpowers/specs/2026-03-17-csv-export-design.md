# CSV Export Feature — Design Spec

## Overview

Add CSV export capability to the Intake Triage Tool, allowing users to download intake data as CSV files from both the list page (bulk export of all completed intakes) and the detail page (single intake export).

## API Endpoints

### Bulk Export: `GET /api/intakes/export`

- Queries all intakes where `aiStatus === "completed"`, ordered by `createdAt` descending
- Returns CSV with headers:
  - `Content-Type: text/csv`
  - `Content-Disposition: attachment; filename="intakes-export-YYYY-MM-DD.csv"`
- If no completed intakes exist, returns a CSV with just the header row (200 status, not an error)
- Database errors return 500 JSON: `{ error: "Failed to export" }`

### Single Export: `GET /api/intakes/[id]/export`

- Queries the specific intake by ID
- Returns 404 JSON `{ error: "Intake not found" }` if not found
- Returns single-row CSV with `Content-Disposition: attachment; filename="intake-{title-slug}.csv"`
- Works regardless of `aiStatus` — null AI fields render as empty cells
- Database errors return 500 JSON: `{ error: "Failed to export" }`

## CSV Format

Columns in order:

| Column                | Source                  | Notes                                      |
|-----------------------|-------------------------|--------------------------------------------|
| `id`                  | `intake.id`             |                                            |
| `title`               | `intake.title`          |                                            |
| `description`         | `intake.description`    |                                            |
| `budget_range`        | `intake.budgetRange`    |                                            |
| `timeline`            | `intake.timeline`       |                                            |
| `industry`            | `intake.industry`       |                                            |
| `created_at`          | `intake.createdAt`      | ISO 8601 format                            |
| `ai_status`           | `intake.aiStatus`       |                                            |
| `ai_summary`          | `intake.aiSummary`      |                                            |
| `ai_tags`             | `intake.aiTags`         | JSON array flattened to comma-separated    |
| `ai_risk_checklist`   | `intake.aiRiskChecklist` | JSON array flattened to comma-separated    |
| `ai_value_proposition`| `intake.aiValueProposition` |                                        |

### Escaping (RFC 4180)

- Fields containing commas, double quotes, or newlines are wrapped in double quotes
- Internal double quotes are escaped by doubling them (`"` becomes `""`)
- Null/undefined fields render as empty cells

### JSON Array Fields

- `aiTags` and `aiRiskChecklist` are stored as JSON strings in the database
- They are parsed and flattened to comma-separated strings (e.g., `"tag1, tag2, tag3"`)
- If JSON parsing fails, the field falls back to an empty cell

## CSV Utility: `src/lib/csv.ts`

A small module providing:

- `escapeCSVField(value: string | null | undefined): string` — RFC 4180 compliant field escaping; null/undefined returns empty string
- `parseJSONArray(value: string | null | undefined): string` — parses a JSON array string into a comma-separated string; returns empty string on null or invalid input
- `intakesToCSV(intakes: Intake[]): string` — converts array of intakes to full CSV string with header row (used for both bulk and single export via `intakesToCSV([intake])`)

## Frontend Changes

### Home/List Page (`src/app/page.tsx`)

- Add "Export CSV" button near the top of the page, alongside the existing "New Intake" button
- Implemented as an `<a>` tag pointing to `/api/intakes/export` — browser handles the download natively via the `Content-Disposition: attachment` header
- Button is always visible (empty export returns header-only CSV)

### Detail Page (`src/app/intakes/[id]/page.tsx`)

- Add "Export CSV" button in the intake header area
- Same `<a>` pattern, pointing to `/api/intakes/{id}/export`

### Styling

- Both buttons use the existing shadcn/ui `Button` component with `variant="outline"`
- Include a `Download` icon from Lucide React
- Consistent with the current design language

## Approach

- No external CSV libraries — a small utility function handles the predictable data shape
- Server-side CSV generation via dedicated API endpoints
- No streaming — CSV built in memory (appropriate for this app's scale)
- No new dependencies required

import type { Intake } from "@prisma/client";

export function escapeCSVField(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

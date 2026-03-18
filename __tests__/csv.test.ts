import { describe, it, expect } from "vitest";
import { escapeCSVField, parseJSONArray, intakesToCSV } from "@/lib/csv";

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
    const csv = intakesToCSV([baseIntake as never]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "id,title,description,budget_range,timeline,industry,created_at,ai_status,ai_summary,ai_tags,ai_risk_checklist,ai_value_proposition"
    );
    expect(lines[1]).toContain("abc123");
    expect(lines[1]).toContain("Test Intake");
  });

  it("flattens aiTags JSON array to comma-separated", () => {
    const csv = intakesToCSV([baseIntake as never]);
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
    const csv = intakesToCSV([pending as never]);
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
    const csv = intakesToCSV([tricky as never]);
    expect(csv).toContain('"He said ""hello, world"""');
  });
});

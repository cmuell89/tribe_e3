import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/intakes/export/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.intake.findMany);

describe("GET /api/intakes/export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns CSV with correct content-type and disposition headers", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const response = await GET();

    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="intakes-export-\d{4}-\d{2}-\d{2}\.csv"$/
    );
  });

  it("queries only completed intakes ordered by createdAt desc", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await GET();

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { aiStatus: "completed" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns header-only CSV when no completed intakes exist", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const response = await GET();
    const text = await response.text();
    const lines = text.trim().split("\n");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("id,title");
  });

  it("returns CSV with data rows for completed intakes", async () => {
    const intakes = [
      {
        id: "abc",
        title: "Test",
        description: "Desc",
        budgetRange: "10k",
        timeline: "Q1",
        industry: "Tech",
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
        aiStatus: "completed",
        aiSummary: "Summary",
        aiTags: '["a","b"]',
        aiRiskChecklist: '["r1"]',
        aiValueProposition: "Value",
        aiError: null,
      },
    ];
    mockFindMany.mockResolvedValueOnce(intakes as never);

    const response = await GET();
    const text = await response.text();
    const lines = text.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("abc");
    expect(lines[1]).toContain("Test");
  });

  it("returns 500 on database error", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB fail"));

    const response = await GET();
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to export");
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/intakes/[id]/export/route";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.intake.findUnique);

const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/intakes/[id]/export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when intake not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost"), makeParams("missing"));
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Intake not found");
  });

  it("returns CSV with correct headers for existing intake", async () => {
    const intake = {
      id: "abc",
      title: "My Intake",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      aiStatus: "completed",
      aiSummary: "Summary",
      aiTags: '["a"]',
      aiRiskChecklist: '["r1"]',
      aiValueProposition: "Value",
      aiError: null,
    };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const response = await GET(new Request("http://localhost"), makeParams("abc"));

    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="intake-my-intake\.csv"$/
    );
  });

  it("returns CSV with header and one data row", async () => {
    const intake = {
      id: "abc",
      title: "Test",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      aiStatus: "completed",
      aiSummary: "Summary",
      aiTags: '["a"]',
      aiRiskChecklist: '["r1"]',
      aiValueProposition: "Value",
      aiError: null,
    };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const response = await GET(new Request("http://localhost"), makeParams("abc"));
    const text = await response.text();
    const lines = text.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("id,title");
    expect(lines[1]).toContain("abc");
  });

  it("works for intake with pending AI status (null AI fields)", async () => {
    const intake = {
      id: "abc",
      title: "Pending",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      aiStatus: "pending",
      aiSummary: null,
      aiTags: null,
      aiRiskChecklist: null,
      aiValueProposition: null,
      aiError: null,
    };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const response = await GET(new Request("http://localhost"), makeParams("abc"));
    expect(response.status).toBe(200);

    const text = await response.text();
    expect(text).toContain("pending");
  });

  it("returns 500 on database error", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("DB fail"));

    const response = await GET(new Request("http://localhost"), makeParams("abc"));
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to export");
  });
});

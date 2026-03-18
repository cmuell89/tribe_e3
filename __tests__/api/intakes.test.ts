import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai", () => ({
  generateTriage: vi.fn(),
}));

import { GET, POST } from "@/app/api/intakes/route";
import { prisma } from "@/lib/db";

const mockFindMany = vi.mocked(prisma.intake.findMany);
const mockCreate = vi.mocked(prisma.intake.create);

describe("GET /api/intakes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all intakes sorted by createdAt desc", async () => {
    const intakes = [
      { id: "1", title: "First", createdAt: new Date() },
      { id: "2", title: "Second", createdAt: new Date() },
    ];
    mockFindMany.mockResolvedValueOnce(intakes as never);

    const response = await GET();
    const data = await response.json();

    expect(data).toHaveLength(2);
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns empty array when no intakes exist", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual([]);
  });
});

describe("POST /api/intakes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates intake and returns 201", async () => {
    const created = {
      id: "abc123",
      title: "Test",
      description: "Desc",
      budgetRange: "",
      timeline: "",
      industry: "",
      aiStatus: "pending",
      createdAt: new Date(),
    };
    mockCreate.mockResolvedValueOnce(created as never);

    const request = new Request("http://localhost/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", description: "Desc" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.id).toBe("abc123");
    expect(data.aiStatus).toBe("pending");
  });

  it("returns 400 for missing required fields", async () => {
    const request = new Request("http://localhost/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new Request("http://localhost/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

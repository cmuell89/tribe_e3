import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    intake: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "@/app/api/intakes/[id]/route";
import { prisma } from "@/lib/db";

const mockFindUnique = vi.mocked(prisma.intake.findUnique);

describe("GET /api/intakes/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns intake when found", async () => {
    const intake = { id: "abc123", title: "Test", aiStatus: "completed" };
    mockFindUnique.mockResolvedValueOnce(intake as never);

    const request = new Request("http://localhost/api/intakes/abc123");
    const response = await GET(request, {
      params: Promise.resolve({ id: "abc123" }),
    });
    const data = await response.json();

    expect(data.id).toBe("abc123");
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "abc123" } });
  });

  it("returns 404 when intake not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/intakes/nonexistent");
    const response = await GET(request, {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });
});

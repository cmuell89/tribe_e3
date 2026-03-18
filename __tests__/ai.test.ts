import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK before importing ai.ts
vi.mock("@anthropic-ai/sdk", () => {
  const APIError = class extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  };

  const mockParse = vi.fn();

  class MockAnthropic {
    messages = { parse: mockParse };
  }

  return {
    default: MockAnthropic,
    APIError,
    __mockParse: mockParse,
  };
});

vi.mock("@anthropic-ai/sdk/helpers/zod", () => ({
  zodOutputFormat: vi.fn().mockReturnValue({ type: "json_schema" }),
}));

import { generateTriage } from "@/lib/ai";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __mockParse: mockParse, APIError } = await import("@anthropic-ai/sdk") as any;

const validIntake = {
  title: "Test Project",
  description: "Test description",
  budgetRange: "$10k",
  timeline: "Q2 2026",
  industry: "Tech",
};

const validResponse = {
  parsed_output: {
    summary: "A test summary.",
    tags: ["tag1", "tag2", "tag3"],
    riskChecklist: ["risk1", "risk2", "risk3"],
    valueProposition: "Good value.",
  },
};

describe("generateTriage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("returns parsed output on success", async () => {
    mockParse.mockResolvedValueOnce(validResponse);
    const result = await generateTriage(validIntake);
    expect(result).toEqual(validResponse.parsed_output);
    expect(mockParse).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 error and succeeds", async () => {
    mockParse
      .mockRejectedValueOnce(new APIError("Server error", 500))
      .mockResolvedValueOnce(validResponse);

    const promise = generateTriage(validIntake);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual(validResponse.parsed_output);
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 rate limit and succeeds", async () => {
    mockParse
      .mockRejectedValueOnce(new APIError("Rate limited", 429))
      .mockResolvedValueOnce(validResponse);

    const promise = generateTriage(validIntake);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toEqual(validResponse.parsed_output);
    expect(mockParse).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400 client error", async () => {
    mockParse.mockRejectedValueOnce(new APIError("Bad request", 400));

    await expect(generateTriage(validIntake)).rejects.toThrow("Bad request");
    expect(mockParse).toHaveBeenCalledTimes(1);
  });

  it("throws after 3 failed retries", async () => {
    mockParse
      .mockRejectedValueOnce(new APIError("Error", 500))
      .mockRejectedValueOnce(new APIError("Error", 500))
      .mockRejectedValueOnce(new APIError("Error", 500));

    const promise = generateTriage(validIntake);
    // Attach rejection handler immediately to avoid unhandled rejection warnings
    const rejection = expect(promise).rejects.toThrow("Error");

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(3000);

    await rejection;
    expect(mockParse).toHaveBeenCalledTimes(3);
  });

  it("throws when parsed_output is null", async () => {
    mockParse.mockResolvedValueOnce({ parsed_output: null });

    await expect(generateTriage(validIntake)).rejects.toThrow(
      "No parsed output returned from Claude"
    );
  });
});

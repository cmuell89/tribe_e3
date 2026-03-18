import { describe, it, expect } from "vitest";
import { createIntakeSchema, triageOutputSchema } from "@/lib/schemas";

describe("createIntakeSchema", () => {
  it("accepts valid full input", () => {
    const result = createIntakeSchema.safeParse({
      title: "Test Project",
      description: "A test project description",
      budgetRange: "$10k-$50k",
      timeline: "Q2 2026",
      industry: "Healthcare",
    });
    expect(result.success).toBe(true);
  });

  it("accepts input with only required fields", () => {
    const result = createIntakeSchema.safeParse({
      title: "Test",
      description: "Description",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgetRange).toBe("");
      expect(result.data.timeline).toBe("");
      expect(result.data.industry).toBe("");
    }
  });

  it("rejects empty title", () => {
    const result = createIntakeSchema.safeParse({
      title: "",
      description: "Valid description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = createIntakeSchema.safeParse({
      title: "Valid title",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 200 characters", () => {
    const result = createIntakeSchema.safeParse({
      title: "a".repeat(201),
      description: "Valid description",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing title", () => {
    const result = createIntakeSchema.safeParse({
      description: "Valid description",
    });
    expect(result.success).toBe(false);
  });
});

describe("triageOutputSchema", () => {
  it("accepts valid triage output", () => {
    const result = triageOutputSchema.safeParse({
      summary: "This is a summary.",
      tags: ["tag1", "tag2", "tag3"],
      riskChecklist: ["risk1", "risk2", "risk3"],
      valueProposition: "This project has strong value.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong number of tags", () => {
    const result = triageOutputSchema.safeParse({
      summary: "Summary.",
      tags: ["tag1", "tag2"],
      riskChecklist: ["risk1", "risk2", "risk3"],
      valueProposition: "Value prop.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too few risk items", () => {
    const result = triageOutputSchema.safeParse({
      summary: "Summary.",
      tags: ["tag1", "tag2", "tag3"],
      riskChecklist: ["risk1", "risk2"],
      valueProposition: "Value prop.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many risk items", () => {
    const result = triageOutputSchema.safeParse({
      summary: "Summary.",
      tags: ["tag1", "tag2", "tag3"],
      riskChecklist: ["r1", "r2", "r3", "r4", "r5", "r6"],
      valueProposition: "Value prop.",
    });
    expect(result.success).toBe(false);
  });
});

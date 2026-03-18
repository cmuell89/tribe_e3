import { describe, it, expect } from "vitest";
import { escapeCSVField } from "@/lib/csv";

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

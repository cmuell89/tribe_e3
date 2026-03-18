import { describe, it, expect } from "vitest";
import { filterIntakes, computeApprovalCounts } from "@/lib/dashboard-utils";

describe("filterIntakes", () => {
  const intakes = [
    { approvalStatus: "submitted" },
    { approvalStatus: "submitted" },
    { approvalStatus: "approved" },
    { approvalStatus: "denied" },
  ];

  it("returns all intakes when filter is null", () => {
    expect(filterIntakes(intakes, null)).toHaveLength(4);
  });

  it("filters by submitted", () => {
    expect(filterIntakes(intakes, "submitted")).toHaveLength(2);
  });

  it("filters by approved", () => {
    expect(filterIntakes(intakes, "approved")).toHaveLength(1);
  });

  it("filters by denied", () => {
    expect(filterIntakes(intakes, "denied")).toHaveLength(1);
  });

  it("returns empty array for no matches", () => {
    const allSubmitted = [{ approvalStatus: "submitted" }];
    expect(filterIntakes(allSubmitted, "denied")).toHaveLength(0);
  });
});

describe("computeApprovalCounts", () => {
  it("computes correct counts", () => {
    const intakes = [
      { approvalStatus: "submitted" },
      { approvalStatus: "submitted" },
      { approvalStatus: "approved" },
      { approvalStatus: "denied" },
    ];
    expect(computeApprovalCounts(intakes)).toEqual({
      total: 4,
      submitted: 2,
      approved: 1,
      denied: 1,
    });
  });

  it("handles empty array", () => {
    expect(computeApprovalCounts([])).toEqual({
      total: 0,
      submitted: 0,
      approved: 0,
      denied: 0,
    });
  });
});

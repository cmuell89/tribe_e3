interface HasApprovalStatus {
  approvalStatus: string;
}

export function filterIntakes<T extends HasApprovalStatus>(
  intakes: T[],
  filter: string | null
): T[] {
  if (!filter) return intakes;
  return intakes.filter((i) => i.approvalStatus === filter);
}

export function computeApprovalCounts(intakes: HasApprovalStatus[]) {
  return {
    total: intakes.length,
    submitted: intakes.filter((i) => i.approvalStatus === "submitted").length,
    approved: intakes.filter((i) => i.approvalStatus === "approved").length,
    denied: intakes.filter((i) => i.approvalStatus === "denied").length,
  };
}

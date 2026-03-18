import { Badge } from "@/components/ui/badge";

const approvalConfig: Record<string, { label: string; className: string }> = {
  submitted: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  denied: {
    label: "Denied",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function ApprovalBadge({ status }: { status: string }) {
  const config = approvalConfig[status] ?? approvalConfig.submitted;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

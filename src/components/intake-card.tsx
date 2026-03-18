import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ApprovalBadge } from "@/components/approval-badge";

interface IntakeCardProps {
  id: string;
  title: string;
  industry: string;
  createdAt: string;
  aiStatus: string;
  approvalStatus: string;
}

function AiStatusIndicator({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <span className="text-xs text-muted-foreground" title="AI triage complete">✓ AI</span>;
    case "pending":
      return <span className="text-xs text-amber-600" title="AI triage pending">⏳ AI</span>;
    case "error":
      return <span className="text-xs text-red-600" title="AI triage error">✗ AI</span>;
    default:
      return null;
  }
}

export function IntakeCard({
  id,
  title,
  industry,
  createdAt,
  aiStatus,
  approvalStatus,
}: IntakeCardProps) {
  return (
    <Link href={`/intakes/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <ApprovalBadge status={approvalStatus} />
            <AiStatusIndicator status={aiStatus} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {industry && <span>{industry}</span>}
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

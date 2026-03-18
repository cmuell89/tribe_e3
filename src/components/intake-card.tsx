import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IntakeCardProps {
  id: string;
  title: string;
  industry: string;
  createdAt: string;
  aiStatus: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  completed: "default",
  error: "destructive",
};

export function IntakeCard({
  id,
  title,
  industry,
  createdAt,
  aiStatus,
}: IntakeCardProps) {
  return (
    <Link href={`/intakes/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant={statusVariant[aiStatus] ?? "secondary"}>
            {aiStatus}
          </Badge>
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

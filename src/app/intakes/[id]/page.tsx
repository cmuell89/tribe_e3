import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiTriagePanel } from "@/components/ai-triage-panel";

export const dynamic = "force-dynamic";

export default async function IntakeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const intake = await prisma.intake.findUnique({ where: { id } });

  if (!intake) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to intakes
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{intake.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{intake.description}</p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Budget:</span>{" "}
              {intake.budgetRange || "—"}
            </div>
            <div>
              <span className="font-medium">Timeline:</span>{" "}
              {intake.timeline || "—"}
            </div>
            <div>
              <span className="font-medium">Industry:</span>{" "}
              {intake.industry || "—"}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {new Date(intake.createdAt).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <AiTriagePanel
        intake={{
          id: intake.id,
          aiStatus: intake.aiStatus,
          aiSummary: intake.aiSummary,
          aiTags: intake.aiTags,
          aiRiskChecklist: intake.aiRiskChecklist,
          aiValueProposition: intake.aiValueProposition,
          aiError: intake.aiError,
        }}
      />
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ClientDashboard } from "@/components/client-dashboard";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const intakes = await prisma.intake.findMany({
    orderBy: { createdAt: "desc" },
  });

  const serializedIntakes = intakes.map((intake) => ({
    id: intake.id,
    title: intake.title,
    industry: intake.industry,
    createdAt: intake.createdAt.toISOString(),
    aiStatus: intake.aiStatus,
    approvalStatus: intake.approvalStatus,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Intakes</h1>
          <p className="text-sm text-muted-foreground">
            Your submitted project requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/intakes/export" download>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </a>
          <Link href="/intakes/new">
            <Button>+ New Intake</Button>
          </Link>
        </div>
      </div>

      <ClientDashboard intakes={serializedIntakes} />
    </div>
  );
}

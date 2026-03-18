import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { IntakeCard } from "@/components/intake-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const intakes = await prisma.intake.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Intakes</h1>
        <Link href="/intakes/new">
          <Button>New Intake</Button>
        </Link>
      </div>

      {intakes.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">
            No intakes yet —{" "}
            <Link href="/intakes/new" className="underline">
              create your first one
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {intakes.map((intake) => (
            <IntakeCard
              key={intake.id}
              id={intake.id}
              title={intake.title}
              industry={intake.industry}
              createdAt={intake.createdAt.toISOString()}
              aiStatus={intake.aiStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

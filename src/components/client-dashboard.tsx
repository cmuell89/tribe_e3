"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { IntakeSummaryCards } from "@/components/intake-summary-cards";
import { IntakeCard } from "@/components/intake-card";
import { filterIntakes, computeApprovalCounts } from "@/lib/dashboard-utils";

interface IntakeData {
  id: string;
  title: string;
  industry: string;
  createdAt: string;
  aiStatus: string;
  approvalStatus: string;
}

interface ClientDashboardProps {
  intakes: IntakeData[];
}

export function ClientDashboard({ intakes }: ClientDashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const counts = useMemo(() => computeApprovalCounts(intakes), [intakes]);

  const filteredIntakes = useMemo(
    () => filterIntakes(intakes, activeFilter),
    [intakes, activeFilter]
  );

  return (
    <>
      <IntakeSummaryCards
        counts={counts}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div className="mt-6 space-y-3">
        {filteredIntakes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">
              {activeFilter ? (
                `No ${activeFilter} intakes`
              ) : (
                <>
                  No intakes yet &mdash;{" "}
                  <Link href="/intakes/new" className="underline">
                    create your first one
                  </Link>
                </>
              )}
            </p>
          </div>
        ) : (
          filteredIntakes.map((intake) => (
            <IntakeCard
              key={intake.id}
              id={intake.id}
              title={intake.title}
              industry={intake.industry}
              createdAt={intake.createdAt}
              aiStatus={intake.aiStatus}
              approvalStatus={intake.approvalStatus}
            />
          ))
        )}
      </div>
    </>
  );
}

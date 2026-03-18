"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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

export function ClientDashboard({ intakes: initialIntakes }: ClientDashboardProps) {
  const [intakes, setIntakes] = useState(initialIntakes);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const hasPending = useMemo(
    () => intakes.some((i) => i.aiStatus === "pending"),
    [intakes]
  );

  const refreshIntakes = useCallback(async () => {
    try {
      const res = await fetch("/api/intakes");
      if (!res.ok) return;
      const data = await res.json();
      setIntakes(
        data.map((intake: Record<string, unknown>) => ({
          id: intake.id as string,
          title: intake.title as string,
          industry: intake.industry as string,
          createdAt: intake.createdAt as string,
          aiStatus: intake.aiStatus as string,
          approvalStatus: intake.approvalStatus as string,
        }))
      );
    } catch {
      // Silently retry on next interval
    }
  }, []);

  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(refreshIntakes, 3000);
    return () => clearInterval(interval);
  }, [hasPending, refreshIntakes]);

  // Sync with server-provided props when they change (e.g. navigation)
  useEffect(() => {
    setIntakes(initialIntakes);
  }, [initialIntakes]);

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

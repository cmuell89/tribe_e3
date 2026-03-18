"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  label: string;
  count: number;
  colorClass: string;
  activeColorClass: string;
  filterValue: string | null;
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

function SummaryCard({
  label,
  count,
  colorClass,
  activeColorClass,
  filterValue,
  activeFilter,
  onFilterChange,
}: SummaryCardProps) {
  const isActive = activeFilter === filterValue;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isActive && activeColorClass
      )}
      onClick={() => onFilterChange(isActive ? null : filterValue)}
    >
      <CardContent className="pt-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
          {label}
        </div>
        <div className={cn("text-2xl font-bold", colorClass)}>{count}</div>
      </CardContent>
    </Card>
  );
}

interface IntakeSummaryCardsProps {
  counts: {
    total: number;
    submitted: number;
    approved: number;
    denied: number;
  };
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

export function IntakeSummaryCards({
  counts,
  activeFilter,
  onFilterChange,
}: IntakeSummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <SummaryCard
        label="Total"
        count={counts.total}
        colorClass="text-foreground"
        activeColorClass="ring-2 ring-foreground/20"
        filterValue={null}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <SummaryCard
        label="Submitted"
        count={counts.submitted}
        colorClass="text-amber-600"
        activeColorClass="ring-2 ring-amber-500/40 bg-amber-50 dark:bg-amber-950/20"
        filterValue="submitted"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <SummaryCard
        label="Approved"
        count={counts.approved}
        colorClass="text-green-600"
        activeColorClass="ring-2 ring-green-500/40 bg-green-50 dark:bg-green-950/20"
        filterValue="approved"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
      <SummaryCard
        label="Denied"
        count={counts.denied}
        colorClass="text-red-600"
        activeColorClass="ring-2 ring-red-500/40 bg-red-50 dark:bg-red-950/20"
        filterValue="denied"
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
}

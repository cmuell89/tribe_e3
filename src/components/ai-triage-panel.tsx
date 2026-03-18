"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Intake {
  id: string;
  aiStatus: string;
  aiSummary: string | null;
  aiTags: string | null;
  aiRiskChecklist: string | null;
  aiValueProposition: string | null;
  aiError: string | null;
}

function safeParseArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function AiTriagePanel({ intake: initial }: { intake: Intake }) {
  const [intake, setIntake] = useState(initial);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (intake.aiStatus !== "pending") return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount >= 30) {
        setTimedOut(true);
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/intakes/${intake.id}`);
        if (res.ok) {
          const updated = await res.json();
          setIntake(updated);
          if (updated.aiStatus !== "pending") {
            clearInterval(interval);
          }
        }
      } catch {
        // Silently retry on network errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [intake.id, intake.aiStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Triage Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {intake.aiStatus === "pending" && !timedOut && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generating triage analysis...
            </p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {timedOut && (
          <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
            Triage generation timed out. Please refresh the page to check again.
          </div>
        )}

        {intake.aiStatus === "error" && (
          <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
            <p className="font-medium mb-1">Triage generation failed</p>
            <p>{intake.aiError || "An unknown error occurred."}</p>
          </div>
        )}

        {intake.aiStatus === "completed" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-1">Summary</h3>
              <p className="text-sm text-muted-foreground">
                {intake.aiSummary}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Tags</h3>
              <div className="flex gap-2 flex-wrap">
                {safeParseArray(intake.aiTags).map((tag, i) => (
                    <Badge key={`tag-${i}`} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Risk Checklist</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {safeParseArray(intake.aiRiskChecklist).map(
                    (risk, i) => <li key={`risk-${i}`}>{risk}</li>
                  )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-1">Value Proposition</h3>
              <p className="text-sm text-muted-foreground">
                {intake.aiValueProposition}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createIntakeSchema } from "@/lib/schemas";
import { generateTriage } from "@/lib/ai";

export async function GET() {
  const intakes = await prisma.intake.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(intakes);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const intake = await prisma.intake.create({
    data: {
      ...parsed.data,
      aiStatus: "pending",
    },
  });

  // Fire-and-forget: do NOT await this
  processAiTriage(intake.id, parsed.data);

  return NextResponse.json(intake, { status: 201 });
}

async function processAiTriage(
  intakeId: string,
  fields: {
    title: string;
    description: string;
    budgetRange: string;
    timeline: string;
    industry: string;
  }
) {
  try {
    const triage = await generateTriage(fields);
    await prisma.intake.update({
      where: { id: intakeId },
      data: {
        aiStatus: "completed",
        aiSummary: triage.summary,
        aiTags: JSON.stringify(triage.tags),
        aiRiskChecklist: JSON.stringify(triage.riskChecklist),
        aiValueProposition: triage.valueProposition,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI processing error";
    await prisma.intake.update({
      where: { id: intakeId },
      data: {
        aiStatus: "error",
        aiError: message,
      },
    });
  }
}

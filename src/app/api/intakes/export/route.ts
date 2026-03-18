import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { intakesToCSV } from "@/lib/csv";

export async function GET() {
  try {
    const intakes = await prisma.intake.findMany({
      where: { aiStatus: "completed" },
      orderBy: { createdAt: "desc" },
    });

    const csv = intakesToCSV(intakes);
    const date = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="intakes-export-${date}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}

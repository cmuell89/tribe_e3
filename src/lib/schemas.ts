import { z } from "zod";

export const createIntakeSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(5000),
  budgetRange: z.string().max(100).optional().default(""),
  timeline: z.string().max(100).optional().default(""),
  industry: z.string().max(100).optional().default(""),
});

export type CreateIntakeInput = z.infer<typeof createIntakeSchema>;

export const triageOutputSchema = z.object({
  summary: z.string().describe("2-3 sentence summary of the project intake"),
  tags: z.array(z.string()).length(3).describe("Exactly 3 relevant tags"),
  riskChecklist: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("3-5 risk items as short bullet points"),
  valueProposition: z
    .string()
    .describe(
      "2-3 sentences evaluating value relative to budget, timeline, and industry"
    ),
});

export type TriageOutput = z.infer<typeof triageOutputSchema>;

export const approvalStatusValues = ["submitted", "approved", "denied"] as const;
export type ApprovalStatus = (typeof approvalStatusValues)[number];

export const intakeResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  budgetRange: z.string().optional(),
  timeline: z.string().optional(),
  industry: z.string().optional(),
  approvalStatus: z.enum(approvalStatusValues),
  aiStatus: z.string(),
  createdAt: z.string(),
});

export type IntakeResponse = z.infer<typeof intakeResponseSchema>;

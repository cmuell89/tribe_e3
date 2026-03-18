import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { triageOutputSchema, type TriageOutput } from "./schemas";

const client = new Anthropic();

const RETRY_DELAYS = [0, 1000, 3000];

interface IntakeFields {
  title: string;
  description: string;
  budgetRange: string;
  timeline: string;
  industry: string;
}

function buildPrompt(intake: IntakeFields): string {
  return [
    `Analyze this project intake:`,
    `- Title: ${intake.title}`,
    `- Description: ${intake.description}`,
    `- Budget: ${intake.budgetRange || "Not specified"}`,
    `- Timeline: ${intake.timeline || "Not specified"}`,
    `- Industry: ${intake.industry || "Not specified"}`,
  ].join("\n");
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    return error.status >= 500 || error.status === 429;
  }
  if (error instanceof Error && error.message.includes("fetch")) {
    return true;
  }
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateTriage(intake: IntakeFields): Promise<TriageOutput> {
  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (RETRY_DELAYS[attempt] > 0) {
      await sleep(RETRY_DELAYS[attempt]);
    }

    try {
      const message = await client.messages.parse({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system:
          "You are a project intake triage assistant. Analyze the project request and produce a triage analysis.",
        messages: [{ role: "user", content: buildPrompt(intake) }],
        output_config: {
          format: zodOutputFormat(triageOutputSchema),
        },
      });

      if (!message.parsed_output) {
        throw new Error("No parsed output returned from Claude");
      }

      return message.parsed_output;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === RETRY_DELAYS.length - 1) {
        break;
      }
    }
  }

  throw lastError;
}

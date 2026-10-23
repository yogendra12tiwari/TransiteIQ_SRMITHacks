import { z } from "zod";
import {
  ruleExplanation,
  containsBannedPhrase,
  redactPII,
  scanInjection,
  type RiskFactors,
} from "@transitiq/shared";
import { PROMPT_VERSIONS, loadPromptText } from "./constants.js";
import { callGemini, isAiEnabled } from "./geminiClient.js";
import { logAiEvent, hashInput } from "../lib/aiLog.js";

export const ExplainRiskInputSchema = z.object({
  stopId: z.string().default(""),
  stopName: z.string().optional(),
  factors: z
    .object({
      wait: z.number().default(0.1),
      night: z.number().default(0),
      lowActivity: z.number().default(0),
      reports: z.number().default(0),
      unreliability: z.number().default(0),
    })
    .default({
      wait: 0.1,
      night: 0,
      lowActivity: 0,
      reports: 0,
      unreliability: 0,
    }),
  expectedWaitMin: z.number().default(10),
  hour: z.number().default(20),
  lang: z.enum(["en", "hi"]).default("en"),
});
export type ExplainRiskInput = z.infer<typeof ExplainRiskInputSchema>;

export interface ExplainRiskResult {
  text: string;
  source: "genkit" | "rules";
  model?: string;
  latencyMs: number;
}

/**
 * Explains wait-risk factors per PRD §10.1, §12.2 and M6-19.
 * Under 280 characters, strictly non-blaming, transparent service explanation.
 * Falls back to deterministic ruleExplanation from @transitiq/shared on any error or guard trigger.
 */
export async function explainRiskFlow(rawInput: unknown): Promise<ExplainRiskResult> {
  const start = Date.now();
  const parsed = ExplainRiskInputSchema.parse(rawInput);
  const inputHash = hashInput(parsed);

  const promptVersion = PROMPT_VERSIONS.explainRisk;
  const guardFlags = {
    piiRedacted: false,
    injectionFlag: false,
    bannedPhraseBlocked: false,
  };

  const getRuleFallback = (): string => {
    const factors: RiskFactors = {
      wait: parsed.factors.wait,
      night: parsed.factors.night,
      lowActivity: parsed.factors.lowActivity,
      reports: parsed.factors.reports,
      unreliability: parsed.factors.unreliability,
    };
    const text = ruleExplanation(factors, parsed.expectedWaitMin, parsed.hour, parsed.lang);
    // Enforce <= 280 chars
    return text.length > 280 ? text.slice(0, 277) + "..." : text;
  };

  // If AI is disabled, use deterministic rules
  if (!isAiEnabled()) {
    const text = getRuleFallback();
    const latencyMs = Date.now() - start;
    await logAiEvent({
      flow: "explainRisk",
      promptVersion,
      source: "rules",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "ok",
    });
    return { text, source: "rules", latencyMs };
  }

  try {
    const promptTemplate = loadPromptText("explainRisk");
    const userPrompt = `${promptTemplate}

Please explain the waiting risk for this stop:
- stopId: ${parsed.stopId}
- stopName: ${parsed.stopName ?? parsed.stopId}
- factors: ${JSON.stringify(parsed.factors)}
- expectedWaitMin: ${parsed.expectedWaitMin}
- hour: ${parsed.hour}
- lang: ${parsed.lang}

Output strictly the explanation text under 280 characters, without preamble or markdown quotes.`;

    const {
      text: rawOutput,
      model,
      latencyMs,
    } = await callGemini(userPrompt, {
      timeoutMs: 4000,
      temperature: 0.1,
      context: { flow: "explainRisk", input: parsed },
    });

    // Clean any surrounding quotes or markdown
    let cleaned = rawOutput.replace(/^["']|["']$/g, "").trim();

    // Guard Check 1: Length <= 280 chars
    if (cleaned.length > 280) {
      cleaned = cleaned.slice(0, 277) + "...";
    }

    // Guard Check 2: Banned Phrases
    if (containsBannedPhrase(cleaned)) {
      guardFlags.bannedPhraseBlocked = true;
      throw new Error("Explanation contained banned phrase");
    }

    // Guard Check 3: PII
    const redaction = redactPII(cleaned);
    if (redaction.redactions.length > 0) {
      guardFlags.piiRedacted = true;
      throw new Error("Explanation contained PII");
    }

    // Guard Check 4: Prompt Injection
    if (scanInjection(cleaned).hasInjection) {
      guardFlags.injectionFlag = true;
      throw new Error("Explanation contained injection artifacts");
    }

    await logAiEvent({
      flow: "explainRisk",
      promptVersion,
      model,
      source: "genkit",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "ok",
    });

    return {
      text: cleaned,
      source: "genkit",
      model,
      latencyMs,
    };
  } catch {
    // Fall back to ruleExplanation
    const text = getRuleFallback();
    const latencyMs = Date.now() - start;
    await logAiEvent({
      flow: "explainRisk",
      promptVersion,
      source: "rules",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "fallback",
    });

    return {
      text,
      source: "rules",
      latencyMs,
    };
  }
}

import { z } from "zod";
import { getRecommendedActions, containsBannedPhrase, redactPII } from "@transitiq/shared";
import { PROMPT_VERSIONS, loadPromptText } from "./constants.js";
import { callGemini, isAiEnabled } from "./geminiClient.js";
import { logAiEvent, hashInput } from "../lib/aiLog.js";

export const RecommendActionsInputSchema = z.object({
  stopId: z.string().default(""),
  stopName: z.string().optional(),
  factors: z.any().optional(),
  aggregates: z
    .object({
      avgEveningWaitMin: z.number().optional(),
      avgWaitMin: z.number().optional(),
      lightingReportsCount: z.number().optional(),
      lightingPoor: z.boolean().optional(),
      lighting: z.string().optional(),
      skipRate: z.number().optional(),
      harassmentReportsCount: z.number().optional(),
      hasHarassmentReports: z.boolean().optional(),
      peakGapTime: z.string().optional(),
    })
    .default({}),
  lang: z.enum(["en", "hi"]).default("en"),
});
export type RecommendActionsInput = z.infer<typeof RecommendActionsInputSchema>;

export interface RecommendActionsResult {
  actions: string[];
  source: "genkit" | "rules";
  model?: string;
  latencyMs: number;
}

/**
 * Action recommendation flow per PRD §10.1 & M6-20.
 * Recommends concrete municipal and transit service interventions.
 * Seamlessly falls back to deterministic rule-based recommendations from @transitiq/shared.
 */
export async function recommendActionsFlow(rawInput: unknown): Promise<RecommendActionsResult> {
  const start = Date.now();
  const parsed = RecommendActionsInputSchema.parse(rawInput);
  const inputHash = hashInput(parsed);

  const promptVersion = PROMPT_VERSIONS.recommendActions;
  const guardFlags = {
    piiRedacted: false,
    injectionFlag: false,
    bannedPhraseBlocked: false,
  };

  const getRuleFallback = (): string[] => {
    return getRecommendedActions(
      {
        stopId: parsed.stopId,
        stopName: parsed.stopName,
        avgWaitMin: parsed.aggregates.avgWaitMin,
        avgEveningWaitMin: parsed.aggregates.avgEveningWaitMin,
        lightingReportsCount: parsed.aggregates.lightingReportsCount,
        lightingPoor: parsed.aggregates.lightingPoor,
        lighting: parsed.aggregates.lighting,
        skipRate: parsed.aggregates.skipRate,
        harassmentReportsCount: parsed.aggregates.harassmentReportsCount,
        hasHarassmentReports: parsed.aggregates.hasHarassmentReports,
        peakGapTime: parsed.aggregates.peakGapTime,
        lang: parsed.lang,
      },
      parsed.lang,
    );
  };

  // If AI is disabled, use deterministic rules
  if (!isAiEnabled()) {
    const actions = getRuleFallback();
    const latencyMs = Date.now() - start;
    await logAiEvent({
      flow: "recommendActions",
      promptVersion,
      source: "rules",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "ok",
    });
    return { actions, source: "rules", latencyMs };
  }

  try {
    const promptTemplate = loadPromptText("recommendActions");
    const userPrompt = `${promptTemplate}

Please recommend transit authority and municipal actions for this stop:
- stopId: ${parsed.stopId}
- stopName: ${parsed.stopName ?? parsed.stopId}
- aggregates: ${JSON.stringify(parsed.aggregates)}
- lang: ${parsed.lang}

Respond ONLY with valid JSON:
{
  "recommendations": ["action 1", "action 2"]
}`;

    const {
      text: responseText,
      model,
      latencyMs,
    } = await callGemini(userPrompt, {
      timeoutMs: 4000,
      temperature: 0.1,
      context: { flow: "recommendActions", input: parsed },
    });

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in model output");
    }

    const parsedJson = JSON.parse(jsonMatch[0]);
    const actions: string[] = Array.isArray(parsedJson.recommendations)
      ? parsedJson.recommendations
      : Array.isArray(parsedJson.actions)
        ? parsedJson.actions
        : [];

    if (actions.length === 0) {
      throw new Error("Empty actions list");
    }

    // Guard Checks
    for (const action of actions) {
      if (containsBannedPhrase(action)) {
        guardFlags.bannedPhraseBlocked = true;
        throw new Error("Action contained banned phrase");
      }
      if (redactPII(action).redactions.length > 0) {
        guardFlags.piiRedacted = true;
        throw new Error("Action contained PII");
      }
    }

    await logAiEvent({
      flow: "recommendActions",
      promptVersion,
      model,
      source: "genkit",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "ok",
    });

    return {
      actions,
      source: "genkit",
      model,
      latencyMs,
    };
  } catch {
    const actions = getRuleFallback();
    const latencyMs = Date.now() - start;
    await logAiEvent({
      flow: "recommendActions",
      promptVersion,
      source: "rules",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "fallback",
    });

    return {
      actions,
      source: "rules",
      latencyMs,
    };
  }
}

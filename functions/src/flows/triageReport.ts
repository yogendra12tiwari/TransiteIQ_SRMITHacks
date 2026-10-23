import { z } from "zod";
import { containsBannedPhrase, redactPII, scanInjection } from "@transitiq/shared";
import { PROMPT_VERSIONS, loadPromptText } from "./constants.js";
import { callGemini, isAiEnabled } from "./geminiClient.js";
import { logAiEvent, hashInput } from "../lib/aiLog.js";

export const TriageInputSchema = z.object({
  text: z.string().default(""),
  category: z.string().default("other"),
  stopId: z.string().default(""),
});
export type TriageInput = z.infer<typeof TriageInputSchema>;

export const TriageOutputSchema = z.object({
  category: z.enum([
    "long_wait",
    "poor_lighting",
    "skipped_bus",
    "overcrowding",
    "harassment_concern",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  lang: z.enum(["en", "hi"]),
  theme: z.string().max(120),
  needsHumanReview: z.boolean(),
});
export type TriageOutput = z.infer<typeof TriageOutputSchema>;

export interface TriageResult extends TriageOutput {
  source: "genkit" | "rules";
  model?: string;
  latencyMs: number;
}

// Keyword Dictionaries
const HARASSMENT_KEYWORDS = [
  // English
  "harass",
  "harassment",
  "catcall",
  "stalk",
  "stalking",
  "following",
  "touched",
  "touching",
  "groped",
  "groping",
  "staring",
  "leering",
  "inappropriate comment",
  "inappropriate touch",
  "threat",
  "threatening",
  "misbehave",
  "misbehavior",
  "abusive",
  "molest",
  "molestation",
  "eve teasing",
  "eve-teasing",
  "cornered",
  // Hindi (Devanagari)
  "छेड़छाड़",
  "पीछा",
  "घूरना",
  "गलत व्यवहार",
  "कमेंट",
  "छेड़खानी",
  "बदतमीजी",
  "फब्तियां",
  "अभद्र",
  "हाथ लगाया",
  "डराया",
  // Hinglish
  "chhedkhani",
  "chhedchhad",
  "badtameezi",
  "badtamezi",
  "picha",
  "ghoorn",
  "stalk",
  "harass",
  "ganda comment",
  "misbehave",
  "lewd",
  "eve-teasing",
];

const LIGHTING_KEYWORDS = [
  // English
  "light",
  "lighting",
  "dark",
  "pitch dark",
  "dim",
  "street light",
  "streetlight",
  "lamp",
  "shadow",
  "visibility",
  "blackout",
  "illumination",
  "bulb",
  "darkness",
  // Hindi
  "रोशनी",
  "अंधेरा",
  "अंधेरे",
  "बत्ती",
  "लाइट",
  "दीया",
  "स्ट्रीट लाइट",
  "खंभा",
  "अंधकार",
  // Hinglish
  "roshni",
  "andhera",
  "andhere",
  "batti",
  "light nahi",
  "dark",
  "no light",
  "bulb kharab",
  "dim light",
];

const WAIT_KEYWORDS = [
  // English
  "wait",
  "waiting",
  "delayed",
  "delay",
  "late",
  "frequency",
  "headway",
  "long time",
  "standing",
  "schedule",
  "not arriving",
  "hour",
  "minutes",
  "stuck",
  // Hindi
  "देर",
  "प्रतीक्षा",
  "इंतजार",
  "इन्तज़ार",
  "लेट",
  "समय",
  "घंटे",
  "मिनट",
  "विलंब",
  "आई नहीं",
  // Hinglish
  "intezar",
  "intezaar",
  "deri",
  "der se",
  "bahut late",
  "wait",
  "kab aayegi",
  "kitni der",
  "khada hu",
  "khadi hu",
];

const SKIP_KEYWORDS = [
  // English
  "skip",
  "skipped",
  "didn't stop",
  "did not stop",
  "passed by",
  "drove past",
  "missed stop",
  "rushed past",
  "ignored",
  "refused to stop",
  "bypassed",
  // Hindi
  "रुकी नहीं",
  "छोड़ दिया",
  "निकल गई",
  "बिना रुके",
  "रोकते रहे",
  "हाथ दिया",
  "निकल गया",
  // Hinglish
  "ruki nahi",
  "chhod di",
  "roki nahi",
  "nikal gayi",
  "chala gaya",
  "skip kiya",
  "haath dikhaya",
];

const CROWDING_KEYWORDS = [
  // English
  "crowd",
  "crowded",
  "overcrowded",
  "rush",
  "no space",
  "packed",
  "jammed",
  "standing room",
  "full",
  "capacity",
  "crush",
  "suffocating",
  // Hindi
  "भीड़",
  "खचाखच",
  "जगह नहीं",
  "बहुत भीड़",
  "ठसाठस",
  // Hinglish
  "bheed",
  "bhid",
  "khachakhach",
  "jagah nahi",
  "full tha",
  "overcrowded",
  "bahut rush",
];

function containsAnyKeyword(text: string, keywords: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export function detectLanguage(text: string): "en" | "hi" {
  if (!text) return "en";
  // Devanagari Unicode range \u0900-\u097F
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi";
  }
  return "en";
}

/**
 * Deterministic rule-based triage per PRD §10.1 & M6-11.
 * Keyword dictionaries in English, Hindi, Hinglish.
 * When category is 'harassment_concern' or harassment keywords hit,
 * sets needsHumanReview = true and severity = 'high'.
 */
export function ruleTriage(input: TriageInput): TriageOutput {
  const text = input.text.trim();
  const rawCat = input.category.trim().toLowerCase();
  const lang = detectLanguage(text);

  const hasHarassment = rawCat === "harassment_concern" || containsAnyKeyword(text, HARASSMENT_KEYWORDS);

  if (hasHarassment) {
    const theme =
      lang === "hi" ? "यात्री सुरक्षा व अनुचित व्यवहार चिंता" : "Passenger safety and harassment concern";
    return {
      category: "harassment_concern",
      severity: "high",
      lang,
      theme,
      needsHumanReview: true,
    };
  }

  const hasLighting = rawCat === "poor_lighting" || containsAnyKeyword(text, LIGHTING_KEYWORDS);
  const hasWait = rawCat === "long_wait" || containsAnyKeyword(text, WAIT_KEYWORDS);
  const hasSkip = rawCat === "skipped_bus" || containsAnyKeyword(text, SKIP_KEYWORDS);
  const hasCrowding = rawCat === "overcrowding" || containsAnyKeyword(text, CROWDING_KEYWORDS);

  // Severity assessment
  if (hasLighting) {
    const isExtreme = /pitch dark|complete darkness|bilkul andhera|ghup andhera|घोर अंधेरा/i.test(text);
    const theme =
      lang === "hi" ? "स्टॉप पर अपर्याप्त रोशनी अथवा अंधेरा" : "Inadequate illumination at transit stop";
    return {
      category: "poor_lighting",
      severity: isExtreme ? "high" : "medium",
      lang,
      theme,
      needsHumanReview: false,
    };
  }

  if (hasWait) {
    const isExtreme =
      /(?:[3-9]\d|\d{3,})\s*(?:min|minute|m|मिनट|घंटे)|[1-9]\s*(?:hour|घंटे)|bahut der|घंटों से/i.test(text);
    const theme =
      lang === "hi" ? "बस आगमन में अत्यधिक प्रतीक्षा समय" : "Excessive waiting time for scheduled bus";
    return {
      category: "long_wait",
      severity: isExtreme ? "high" : "medium",
      lang,
      theme,
      needsHumanReview: false,
    };
  }

  if (hasSkip) {
    const theme = lang === "hi" ? "स्टॉप पर बस न रुकने की शिकायत" : "Bus bypassed waiting passengers";
    return {
      category: "skipped_bus",
      severity: "medium",
      lang,
      theme,
      needsHumanReview: false,
    };
  }

  if (hasCrowding) {
    const theme =
      lang === "hi" ? "बस अथवा स्टॉप पर अत्यधिक भीड़" : "Overcrowding in vehicle or boarding area";
    return {
      category: "overcrowding",
      severity: "medium",
      lang,
      theme,
      needsHumanReview: false,
    };
  }

  // Fallback to category provided or "other"
  const allowed = [
    "long_wait",
    "poor_lighting",
    "skipped_bus",
    "overcrowding",
    "harassment_concern",
    "other",
  ] as const;
  type TriageCategory = (typeof allowed)[number];
  const isAllowed = (cat: string): cat is TriageCategory => (allowed as readonly string[]).includes(cat);
  const category: TriageCategory = isAllowed(rawCat) ? rawCat : "other";

  const theme = lang === "hi" ? "सामान्य ट्रांजिट रिपोर्ट" : "General transit observation";

  return {
    category,
    severity: "low",
    lang,
    theme,
    needsHumanReview: false,
  };
}

/**
 * Triage Report flow per PRD §10.1 & Milestone M6.
 * Invokes Gemini LLM when active, with 4s timeout and strict safety guards.
 * Seamlessly falls back to deterministic rules on any failure, timeout, or banned phrase.
 */
export async function triageReportFlow(rawInput: unknown): Promise<TriageResult> {
  const start = Date.now();
  const parsedInput = TriageInputSchema.parse(rawInput);
  const inputHash = hashInput(parsedInput);

  // Redact input text and check injection
  const redacted = redactPII(parsedInput.text);
  const injection = scanInjection(redacted.text);

  const guardFlags = {
    piiRedacted: redacted.redactions.length > 0,
    injectionFlag: injection.hasInjection,
    bannedPhraseBlocked: false,
  };

  const promptVersion = PROMPT_VERSIONS.triageReport;

  // If AI is not enabled or injection detected, use deterministic rule triage
  if (!isAiEnabled() || injection.hasInjection) {
    const ruleResult = ruleTriage({
      text: redacted.text,
      category: parsedInput.category,
      stopId: parsedInput.stopId,
    });

    const latencyMs = Date.now() - start;
    await logAiEvent({
      flow: "triageReport",
      promptVersion,
      source: "rules",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "ok",
    });

    return {
      ...ruleResult,
      source: "rules",
      latencyMs,
    };
  }

  // Attempt Genkit / Gemini flow
  try {
    const promptTemplate = loadPromptText("triageReport");
    const userPrompt = `${promptTemplate}

Process this new report:
Input:
- text: ${JSON.stringify(redacted.text)}
- category: ${JSON.stringify(parsedInput.category)}
- stopId: ${JSON.stringify(parsedInput.stopId)}

Respond ONLY with valid JSON conforming to the output schema.`;

    const {
      text: responseText,
      model,
      latencyMs,
    } = await callGemini(userPrompt, {
      timeoutMs: 4000,
      temperature: 0.1,
      context: { flow: "triageReport", input: parsedInput },
    });

    // Extract JSON from output
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in model output");
    }

    const rawJson = JSON.parse(jsonMatch[0]);
    const validated = TriageOutputSchema.parse(rawJson);

    // Guard Check 1: Banned Phrases
    if (containsBannedPhrase(validated.theme) || containsBannedPhrase(responseText)) {
      guardFlags.bannedPhraseBlocked = true;
      throw new Error("Output contained banned phrase");
    }

    // Guard Check 2: Unredacted PII in output theme
    const themeRedaction = redactPII(validated.theme);
    if (themeRedaction.redactions.length > 0) {
      throw new Error("Output leaked unredacted PII");
    }

    // Enforce safety rule: harassment must trigger human review and high severity
    if (
      validated.category === "harassment_concern" ||
      parsedInput.category === "harassment_concern" ||
      containsAnyKeyword(redacted.text, HARASSMENT_KEYWORDS)
    ) {
      validated.category = "harassment_concern";
      validated.severity = "high";
      validated.needsHumanReview = true;
    }

    await logAiEvent({
      flow: "triageReport",
      promptVersion,
      model,
      source: "genkit",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "ok",
    });

    return {
      ...validated,
      source: "genkit",
      model,
      latencyMs,
    };
  } catch {
    // Fall back seamlessly to deterministic rules
    const ruleResult = ruleTriage({
      text: redacted.text,
      category: parsedInput.category,
      stopId: parsedInput.stopId,
    });

    const latencyMs = Date.now() - start;
    await logAiEvent({
      flow: "triageReport",
      promptVersion,
      source: "rules",
      inputHash,
      guardFlags,
      latencyMs,
      outcome: "fallback",
    });

    return {
      ...ruleResult,
      source: "rules",
      latencyMs,
    };
  }
}

/**
 * Rule-based recommendations engine per PRD §10.4.
 * Always available deterministically with English and Hindi output.
 *
 * Rules:
 * 1. harassmentReportsCount > 0 => Prioritize human review and transit marshal / police presence.
 * 2. lightingReportsCount >= 3 or lightingPoor => Improve lighting and high-mast lamps.
 * 3. skipRate > 0.2 => Investigate bus skipping with depot supervisor.
 * 4. avgWaitMin > 15 => Add departure / increase evening frequency.
 */

import type { Lang } from "../schemas/common.js";

export interface RecommendationInput {
  stopId?: string;
  stopName?: string;
  avgWaitMin?: number;
  avgEveningWaitMin?: number;
  lightingReportsCount?: number;
  lightingPoor?: boolean;
  lighting?: "good" | "fair" | "poor" | string;
  skipRate?: number;
  harassmentReportsCount?: number;
  hasHarassmentReports?: boolean;
  peakGapTime?: string;
  routeName?: string;
  lang?: Lang;
}

export type RecommendationType = "frequency" | "lighting" | "skipping" | "marshal_review";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  priority: number; // 1 = highest, 4 = lowest
  action: string;
  actionEn: string;
  actionHi: string;
  reason: string;
  reasonEn: string;
  reasonHi: string;
}

/**
 * Generates rule-based recommendations sorted by priority.
 */
export function generateRecommendations(input: RecommendationInput): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const lang: Lang = input.lang ?? "en";

  // Rule 1: Harassment Reports (Priority 1)
  const hasHarassment =
    (input.harassmentReportsCount !== undefined && input.harassmentReportsCount > 0) ||
    input.hasHarassmentReports === true;

  if (hasHarassment) {
    const actionEn = "Prioritize human review and transit marshal / police presence.";
    const actionHi = "मानवीय समीक्षा को प्राथमिकता दें और ट्रांजिट मार्शल / पुलिस उपस्थिति सुनिश्चित करें।";
    const reasonEn = "Safety concern reports require immediate human review and visible corridor monitoring.";
    const reasonHi = "सुरक्षा संबंधी रिपोर्टों के लिए तत्काल मानवीय समीक्षा और कॉरिडोर निगरानी आवश्यक है।";

    recommendations.push({
      id: "rec-harassment-review",
      type: "marshal_review",
      priority: 1,
      action: lang === "hi" ? actionHi : actionEn,
      actionEn,
      actionHi,
      reason: lang === "hi" ? reasonHi : reasonEn,
      reasonEn,
      reasonHi,
    });
  }

  // Rule 2: Lighting Deficits (Priority 2)
  const hasLightingIssue =
    (input.lightingReportsCount !== undefined && input.lightingReportsCount >= 3) ||
    input.lightingPoor === true ||
    input.lighting === "poor";

  if (hasLightingIssue) {
    const actionEn = "Improve lighting and install high-mast lamps at this stop.";
    const actionHi = "इस स्टॉप पर प्रकाश व्यवस्था सुधारें और हाई-मास्ट लैंप लगाएं।";
    const reasonEn = "Multiple reports of poor lighting or low ambient illumination detected at stop.";
    const reasonHi = "स्टॉप पर खराब रोशनी या कम प्रकाश की कई रिपोर्टें प्राप्त हुई हैं।";

    recommendations.push({
      id: "rec-lighting-improve",
      type: "lighting",
      priority: 2,
      action: lang === "hi" ? actionHi : actionEn,
      actionEn,
      actionHi,
      reason: lang === "hi" ? reasonHi : reasonEn,
      reasonEn,
      reasonHi,
    });
  }

  // Rule 3: High Skip Rate (Priority 3)
  const hasSkipIssue = input.skipRate !== undefined && input.skipRate > 0.2;

  if (hasSkipIssue) {
    const pct = Math.round((input.skipRate ?? 0) * 100);
    const actionEn = "Investigate bus skipping with depot supervisor.";
    const actionHi = "डिपो सुपरवाइजर के साथ मिलकर बस छोड़ने (स्किपिंग) की जांच करें।";
    const reasonEn = `Bus skip rate is ${pct}%, exceeding the 20% operational threshold.`;
    const reasonHi = `बस छोड़ने की दर ${pct}% है, जो 20% परिचालन सीमा से अधिक है।`;

    recommendations.push({
      id: "rec-skip-investigate",
      type: "skipping",
      priority: 3,
      action: lang === "hi" ? actionHi : actionEn,
      actionEn,
      actionHi,
      reason: lang === "hi" ? reasonHi : reasonEn,
      reasonEn,
      reasonHi,
    });
  }

  // Rule 4: Excessive Wait / Frequency Gap (Priority 4)
  const effectiveWait = input.avgWaitMin ?? input.avgEveningWaitMin ?? 0;
  if (effectiveWait > 15) {
    const gap = input.peakGapTime ?? "7:45 PM";
    const waitVal = Math.round(effectiveWait);
    const actionEn = `Add a departure around the peak gap (e.g. ${gap}) to reduce evening wait.`;
    const actionHi = `शाम का इंतजार कम करने के लिए पीक अंतराल में अतिरिक्त बस जोड़ें (उदा. ${gap})।`;
    const reasonEn = `Average wait time is ${waitVal} min, exceeding the 15-minute threshold.`;
    const reasonHi = `औसत प्रतीक्षा समय ${waitVal} मिनट है, जो 15 मिनट की सीमा से अधिक है।`;

    recommendations.push({
      id: "rec-frequency-boost",
      type: "frequency",
      priority: 4,
      action: lang === "hi" ? actionHi : actionEn,
      actionEn,
      actionHi,
      reason: lang === "hi" ? reasonHi : reasonEn,
      reasonEn,
      reasonHi,
    });
  }

  // Sort by priority ascending (1 = highest)
  return recommendations.sort((a, b) => a.priority - b.priority);
}

/**
 * Returns plain list of recommended action strings per PRD §10.1 { actions: string[] }.
 */
export function getRecommendedActions(input: RecommendationInput, lang: Lang = input.lang ?? "en"): string[] {
  const recs = generateRecommendations({ ...input, lang });
  return recs.map((r) => (lang === "hi" ? r.actionHi : r.actionEn));
}

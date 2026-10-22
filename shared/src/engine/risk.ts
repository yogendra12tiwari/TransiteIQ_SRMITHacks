import type { Stop } from "../schemas/network.js";
import type { RiskLabel } from "../schemas/common.js";
import { type RiskFactors, type WaitRisk } from "../schemas/risk.js";
import { ruleExplanation, type ExplanationLang } from "./explain.js";

/**
 * Computes transparent, explainable wait-risk score per PRD §9.3.
 *
 * Factors:
 * - wait (weight 0.30): waitMin / 20 capped at 1.0
 * - night (weight 0.20): 1.0 if hour >= 19 or hour < 6, else 0.2
 * - lowActivity (weight 0.20): 1 - stop.activity
 * - reports (weight 0.20): min(recentSafetyReports / 10, 1.0)
 * - unreliability (weight 0.10): stop.skipRate
 *
 * Thresholds:
 * - score < 0.35 => "Low"
 * - score > 0.65 => "High"
 * - otherwise => "Medium"
 */
export function waitRisk(
  stop: Pick<Stop, "id" | "activity" | "skipRate">,
  hour: number,
  expectedWaitMin: number,
  recentSafetyReports: number,
  lang: ExplanationLang = "en",
): WaitRisk {
  const nightVal = hour >= 19 || hour < 6 ? 1.0 : 0.2;
  const waitVal = Math.min(Math.max(0, expectedWaitMin) / 20, 1.0);
  const lowActivityVal = Math.max(0, Math.min(1.0 - stop.activity, 1.0));
  const reportsVal = Math.min(Math.max(0, recentSafetyReports) / 10, 1.0);
  const unreliabilityVal = Math.max(0, Math.min(stop.skipRate, 1.0));

  const factors: RiskFactors = {
    wait: Math.round(0.3 * waitVal * 1000) / 1000,
    night: Math.round(0.2 * nightVal * 1000) / 1000,
    lowActivity: Math.round(0.2 * lowActivityVal * 1000) / 1000,
    reports: Math.round(0.2 * reportsVal * 1000) / 1000,
    unreliability: Math.round(0.1 * unreliabilityVal * 1000) / 1000,
  };

  const rawScore =
    factors.wait + factors.night + factors.lowActivity + factors.reports + factors.unreliability;

  const score = Math.round(rawScore * 1000) / 1000;

  let label: RiskLabel;
  if (score < 0.35) {
    label = "Low";
  } else if (score > 0.65) {
    label = "High";
  } else {
    label = "Medium";
  }

  const explanation = ruleExplanation(factors, expectedWaitMin, hour, lang);

  return {
    stopId: stop.id,
    score,
    label,
    factors,
    explanation,
  };
}

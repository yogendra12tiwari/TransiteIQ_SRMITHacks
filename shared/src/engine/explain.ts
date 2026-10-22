import type { RiskFactors } from "../schemas/risk.js";

export type ExplanationLang = "en" | "hi";

/**
 * Generates an objective, transparent rule-based explanation for wait risk per PRD §9.3 & §12.2.
 * Never uses banned phrases (crime prediction, neighborhood stigmatization, or victim-blaming).
 */
export function ruleExplanation(
  factors: RiskFactors,
  expectedWaitMin: number,
  hour: number,
  lang: ExplanationLang = "en",
): string {
  const roundedWait = Math.round(expectedWaitMin * 10) / 10;
  const isNight = hour >= 19 || hour < 6;
  const totalScore =
    factors.wait + factors.night + factors.lowActivity + factors.reports + factors.unreliability;

  if (lang === "hi") {
    if (totalScore > 0.65) {
      const reasons: string[] = [];
      if (factors.wait >= 0.15) reasons.push(`लंबी प्रतीक्षा (${roundedWait} मिनट)`);
      if (isNight) reasons.push("शाम/रात का समय");
      if (factors.lowActivity >= 0.1) reasons.push("आसपास कम गतिविधि");
      if (factors.reports >= 0.08) reasons.push("हालिया रिपोर्टें");
      if (factors.unreliability >= 0.02) reasons.push("अनियमित बस सेवा");

      return `अधिक प्रतीक्षा जोखिम: ${reasons.join(", ") || `${roundedWait} मिनट प्रतीक्षा`}`;
    }

    if (totalScore < 0.35) {
      return `कम प्रतीक्षा जोखिम: कम प्रतीक्षा (${roundedWait} मिनट), सक्रिय और अच्छी रोशनी वाला स्टॉप, विश्वसनीय सेवा`;
    }

    return `मध्यम प्रतीक्षा जोखिम: ${roundedWait} मिनट प्रतीक्षा, मध्यम गतिविधि और सामान्य सेवा`;
  }

  // English (default)
  if (totalScore > 0.65) {
    const reasons: string[] = [];
    if (factors.wait >= 0.15) reasons.push(`long wait (${roundedWait} min)`);
    if (isNight) reasons.push("evening/night hours");
    if (factors.lowActivity >= 0.1) reasons.push("low nearby activity");
    if (factors.reports >= 0.08) reasons.push("recent reports");
    if (factors.unreliability >= 0.02) reasons.push("service unreliability");

    return `High waiting risk because: ${reasons.join(", ") || `${roundedWait} min wait`}`;
  }

  if (totalScore < 0.35) {
    return `Low waiting risk: short wait (${roundedWait} min), active well-lit stop, reliable service`;
  }

  return `Moderate waiting risk: ${roundedWait} min wait, moderate nearby activity`;
}

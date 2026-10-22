import { haversineM } from "./geo.js";
import type { SafeSpot } from "../schemas/network.js";

export type SafeWaitAlertStatus =
  "none" | "primary_fired" | "acknowledged" | "snoozed" | "escalated" | "dismissed";

export interface SafeWaitCheckParams {
  etaMeanMin: number;
  etaLowMin: number;
  etaHighMin: number;
  walkMin: number;
  bufferMin?: number; // default 2 min (Decision D2)
  currentStatus: SafeWaitAlertStatus;
  busName?: string;
  isLikelySkip?: boolean;
  nextBusWaitMin?: number;
  lang?: "en" | "hi";
}

export interface SafeWaitDecision {
  action: "none" | "fire_primary" | "fire_escalation" | "suggest_next_bus";
  message: string | null;
  urgency: "normal" | "urgent" | "warning";
}

/**
 * Builds localized Safe Wait notifications per PRD §9.6 & Decision D2.
 */
export function buildSafeWaitMessage(params: {
  type: "primary" | "escalation" | "skip";
  busName?: string;
  etaMeanMin?: number;
  walkMin: number;
  nextBusWaitMin?: number;
  lang?: "en" | "hi";
}): string {
  const { type, busName = "Bus", etaMeanMin = 5, walkMin, nextBusWaitMin = 25, lang = "en" } = params;

  if (type === "escalation") {
    return lang === "hi"
      ? "बस अनुमान से पहले पहुंच रही है — अभी निकलें।"
      : "Bus is arriving sooner than expected — leave now.";
  }

  if (type === "skip") {
    return lang === "hi"
      ? `${busName} विलंबित है या स्टॉप छोड़ सकती है। अगली ${busName} का सुझाव (~${nextBusWaitMin} मिनट)।`
      : `${busName} is delayed or likely to skip. Suggesting next ${busName} arriving in ~${nextBusWaitMin} min.`;
  }

  const roundedEta = Math.max(1, Math.round(etaMeanMin));
  return lang === "hi"
    ? `${busName} लगभग ${roundedEta} मिनट दूर है। अभी निकलें (${walkMin} मिनट पैदल)।`
    : `${busName} is ~${roundedEta} min away. Leave now (${walkMin} min walk).`;
}

/**
 * Checks Safe Wait conditions per Decision D2:
 * 1. Primary alert: etaHighMin <= walkMin + bufferMin (buffer = 2 min)
 * 2. Escalation alert: etaLowMin <= walkMin + 1 (if primary unacknowledged)
 * 3. Handles LIKELY_SKIP alerts by suggesting the subsequent bus
 */
export function checkSafeWaitTrigger(params: SafeWaitCheckParams): SafeWaitDecision {
  const {
    etaMeanMin,
    etaLowMin,
    etaHighMin,
    walkMin,
    bufferMin = 2,
    currentStatus,
    busName = "Bus",
    isLikelySkip = false,
    nextBusWaitMin = 25,
    lang = "en",
  } = params;

  // 1. If bus is likely skipping, inform user immediately
  if (isLikelySkip && currentStatus !== "dismissed") {
    return {
      action: "suggest_next_bus",
      message: buildSafeWaitMessage({ type: "skip", busName, walkMin, nextBusWaitMin, lang }),
      urgency: "warning",
    };
  }

  // 2. Escalation check: bus arriving sooner than expected and primary was unacknowledged
  if (currentStatus === "primary_fired" && etaLowMin <= walkMin + 1) {
    return {
      action: "fire_escalation",
      message: buildSafeWaitMessage({ type: "escalation", lang, walkMin }),
      urgency: "urgent",
    };
  }

  // 3. Primary trigger: etaHighMin <= walkMin + bufferMin
  if (currentStatus === "none" && etaHighMin <= walkMin + bufferMin) {
    return {
      action: "fire_primary",
      message: buildSafeWaitMessage({ type: "primary", busName, etaMeanMin, walkMin, lang }),
      urgency: "normal",
    };
  }

  return {
    action: "none",
    message: null,
    urgency: "normal",
  };
}

export interface NearbySafeSpot extends SafeSpot {
  distanceM: number;
}

/**
 * Finds safe waiting spots within radiusM (default 250m) of a stop.
 * Sorts prioritizing openLate spots first, then by ascending walking distance.
 */
export function nearbySafeSpots(
  stop: { lat: number; lng: number },
  safeSpots: SafeSpot[],
  radiusM = 250,
): NearbySafeSpot[] {
  return safeSpots
    .map((spot) => {
      const distanceM = Math.round(haversineM([stop.lat, stop.lng], [spot.lat, spot.lng]));
      return {
        ...spot,
        distanceM,
      };
    })
    .filter((spot) => spot.distanceM <= radiusM)
    .sort((a, b) => {
      // Prioritize openLate
      if (a.openLate && !b.openLate) return -1;
      if (!a.openLate && b.openLate) return 1;
      return a.distanceM - b.distanceM;
    });
}

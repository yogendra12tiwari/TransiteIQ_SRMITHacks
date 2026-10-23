import type { Route } from "../schemas/network.js";
import type { RouteScore } from "../schemas/live.js";

export interface RoutePerformanceInput {
  route: Route;
  onTimeDepartures?: number;
  totalDepartures?: number;
  headwayAdherence?: number; // 0..1
  skipRate?: number; // 0..1
  positiveFeedbackCount?: number;
  totalFeedbackCount?: number;
  nowMs?: number;
}

/**
 * Calculates deterministic RouteScore (0-100) combining:
 * - punctuality (35%): on-time departure rate
 * - frequency (25%): headway adherence
 * - reliability (25%): inverse of skip rate
 * - feedback (15%): commuter safety & service satisfaction
 *
 * M6b P2-09 & P2-16 (PRD §3.2, §3.4)
 */
export function computeRouteScore(input: RoutePerformanceInput): RouteScore {
  const onTime = input.onTimeDepartures ?? 42;
  const total = input.totalDepartures ?? 48;
  const punctuality = Math.min(100, Math.max(0, Math.round((onTime / Math.max(1, total)) * 100)));

  const adherence = input.headwayAdherence ?? 0.88;
  const frequency = Math.min(100, Math.max(0, Math.round(adherence * 100)));

  const skipRate = input.skipRate ?? 0.06;
  const reliability = Math.min(100, Math.max(0, Math.round((1 - skipRate) * 100)));

  const posFeedback = input.positiveFeedbackCount ?? 38;
  const totalFeedback = input.totalFeedbackCount ?? 45;
  const feedback = Math.min(100, Math.max(0, Math.round((posFeedback / Math.max(1, totalFeedback)) * 100)));

  const overall = Math.round(0.35 * punctuality + 0.25 * frequency + 0.25 * reliability + 0.15 * feedback);

  return {
    routeId: input.route.id,
    punctuality,
    frequency,
    reliability,
    feedback,
    overall,
    updatedAt: input.nowMs ?? Date.now(),
  };
}

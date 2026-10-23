import { HttpsError } from "firebase-functions/v2/https";
import { generateRecommendations, waitRisk } from "@transitiq/shared";

export interface DashboardSummaryResult {
  kpis: {
    avgEveningWaitMin: number;
    delayedBusesCount: number;
    totalSafetyReports: number;
    ghostBusRatePercent: number;
  };
  priorityStops: Array<{
    stopId: string;
    stopName: string;
    avgEveningWaitMin: number;
    safetyReportsCount: number;
    riskBand: "low" | "medium" | "high";
    riskScore: number;
    priorityScore: number;
    recommendedActions: string[];
    headline: string;
    ridershipPerEvening: number;
  }>;
  clusters: Array<{
    clusterId: string;
    stopName: string;
    category: string;
    count: number;
  }>;
  generatedAt: number;
}

const DEFAULT_STOPS_DATA = [
  {
    stopId: "stop_A",
    stopName: "Stop A (Hazratganj)",
    avgEveningWaitMin: 18,
    safetyReportsCount: 7,
    ridershipPerEvening: 420,
    lighting: "poor",
    skipRate: 0.15,
    lightingReportsCount: 4,
    harassmentReportsCount: 2,
    attributes: {
      activity: 0.15,
      lighting: "poor" as const,
      reportsCount: 7,
      historicalUnreliability: 0.2,
    },
  },
  {
    stopId: "stop_D",
    stopName: "Stop D (Polytechnic)",
    avgEveningWaitMin: 14,
    safetyReportsCount: 4,
    ridershipPerEvening: 290,
    lighting: "fair",
    skipRate: 0.1,
    lightingReportsCount: 2,
    harassmentReportsCount: 1,
    attributes: {
      activity: 0.4,
      lighting: "fair" as const,
      reportsCount: 4,
      historicalUnreliability: 0.1,
    },
  },
  {
    stopId: "stop_C",
    stopName: "Stop C (Alambagh)",
    avgEveningWaitMin: 11,
    safetyReportsCount: 3,
    ridershipPerEvening: 310,
    lighting: "fair",
    skipRate: 0.08,
    lightingReportsCount: 1,
    harassmentReportsCount: 0,
    attributes: {
      activity: 0.6,
      lighting: "fair" as const,
      reportsCount: 3,
      historicalUnreliability: 0.08,
    },
  },
  {
    stopId: "stop_B",
    stopName: "Stop B (Charbagh)",
    avgEveningWaitMin: 4,
    safetyReportsCount: 1,
    ridershipPerEvening: 680,
    lighting: "good",
    skipRate: 0.04,
    lightingReportsCount: 0,
    harassmentReportsCount: 0,
    attributes: {
      activity: 0.85,
      lighting: "good" as const,
      reportsCount: 1,
      historicalUnreliability: 0.05,
    },
  },
];

export async function dashboardSummaryHandler(
  _input: unknown,
  authRole?: string,
  nowMs = Date.now(),
): Promise<DashboardSummaryResult> {
  // Operator only check (PRD §10.4, M6-29)
  if (authRole !== "operator") {
    throw new HttpsError("permission-denied", "Operator authorization required for dashboard summary");
  }

  const priorityStops = DEFAULT_STOPS_DATA.map((stop) => {
    const risk = waitRisk(
      { id: stop.stopId, activity: stop.attributes.activity, skipRate: stop.skipRate },
      20,
      stop.avgEveningWaitMin,
      stop.safetyReportsCount,
      "en",
    );
    const recs = generateRecommendations({
      stopId: stop.stopId,
      stopName: stop.stopName,
      avgWaitMin: stop.avgEveningWaitMin,
      avgEveningWaitMin: stop.avgEveningWaitMin,
      lightingPoor: stop.lighting === "poor",
      lightingReportsCount: stop.lightingReportsCount,
      harassmentReportsCount: stop.harassmentReportsCount,
      skipRate: stop.skipRate,
      lang: "en",
    });

    const priorityScore = Math.round(risk.score * stop.ridershipPerEvening);

    // Headline per PRD §10.4 & M6-32: "Stop A: average evening wait 18 minutes, 7 safety-related reports"
    const headline = `${stop.stopName}: average evening wait ${stop.avgEveningWaitMin} minutes, ${stop.safetyReportsCount} safety-related reports`;

    return {
      stopId: stop.stopId,
      stopName: stop.stopName,
      avgEveningWaitMin: stop.avgEveningWaitMin,
      safetyReportsCount: stop.safetyReportsCount,
      riskBand: risk.label.toLowerCase() as "low" | "medium" | "high",
      riskScore: risk.score,
      priorityScore,
      recommendedActions: recs.map((r) => r.action),
      headline,
      ridershipPerEvening: stop.ridershipPerEvening,
    };
  });

  // Rank by composite exposure score (risk * ridershipPerEvening)
  priorityStops.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    kpis: {
      avgEveningWaitMin: 14.2,
      delayedBusesCount: 1,
      totalSafetyReports: 12,
      ghostBusRatePercent: 2.1,
    },
    priorityStops,
    clusters: [
      {
        clusterId: "cluster_stop_A_poor_lighting",
        stopName: "Stop A (Hazratganj)",
        category: "poor_lighting",
        count: 4,
      },
      {
        clusterId: "cluster_stop_A_harassment_concern",
        stopName: "Stop A (Hazratganj)",
        category: "harassment_concern",
        count: 2,
      },
      {
        clusterId: "cluster_stop_D_long_wait",
        stopName: "Stop D (Polytechnic)",
        category: "long_wait",
        count: 3,
      },
    ],
    generatedAt: nowMs,
  };
}

import { HttpsError } from "firebase-functions/v2/https";

export interface StopAggregateRow {
  stopId: string;
  stopName: string;
  ridershipPerEvening: number;
  activity: number;
  skipRate: number;
  safetyReportsCount: number;
  waitRiskScore: number;
  avgWaitMin: number;
}

export async function exportReportHandler(
  role?: string,
  rowsProvider?: () => Promise<StopAggregateRow[]>,
): Promise<{ csv: string; rowCount: number }> {
  if (role !== "operator") {
    throw new HttpsError("permission-denied", "Operator claim required to export report data");
  }

  const rows = rowsProvider
    ? await rowsProvider()
    : [
        {
          stopId: "stop_A",
          stopName: "Hazratganj (Isolated)",
          ridershipPerEvening: 400,
          activity: 0.2,
          skipRate: 0.25,
          safetyReportsCount: 7,
          waitRiskScore: 0.795,
          avgWaitMin: 18,
        },
        {
          stopId: "stop_B",
          stopName: "Market Junction",
          ridershipPerEvening: 420,
          activity: 0.8,
          skipRate: 0.05,
          safetyReportsCount: 1,
          waitRiskScore: 0.325,
          avgWaitMin: 4,
        },
        {
          stopId: "stop_charbagh",
          stopName: "Charbagh Main",
          ridershipPerEvening: 900,
          activity: 0.9,
          skipRate: 0.05,
          safetyReportsCount: 2,
          waitRiskScore: 0.31,
          avgWaitMin: 5,
        },
        {
          stopId: "stop_aminabad",
          stopName: "Aminabad Central",
          ridershipPerEvening: 650,
          activity: 0.85,
          skipRate: 0.08,
          safetyReportsCount: 3,
          waitRiskScore: 0.38,
          avgWaitMin: 7,
        },
      ];

  const header =
    "stop_id,stop_name,ridership_evening,activity,skip_rate,safety_reports_30d,wait_risk_score,avg_wait_min\n";
  const lines = rows.map(
    (r) =>
      `"${r.stopId}","${r.stopName}",${r.ridershipPerEvening},${r.activity},${r.skipRate},${r.safetyReportsCount},${r.waitRiskScore},${r.avgWaitMin}`,
  );

  return {
    csv: header + lines.join("\n"),
    rowCount: rows.length,
  };
}

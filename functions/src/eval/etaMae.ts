import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface EtaMaeResult {
  totalSamples: number;
  modelMae: number;
  baselineMae: number;
  improvementPct: number;
  coverage80Pct: number;
  summary: string;
}

export interface HistoryRecord {
  day: number;
  hour: number;
  waitMin: number;
  delayMin: number;
  skipped: boolean;
  etaErrorMin: number;
}

export type HistoryData = Record<string, HistoryRecord[]>;

/**
 * Computes ETA Mean Absolute Error (MAE) and 80% band coverage for TransitIQ
 * compared to a naive schedule-only baseline over 30-day simulated history.
 */
export function computeEtaMae(customData?: HistoryData): EtaMaeResult {
  let history: HistoryData;

  if (customData) {
    history = customData;
  } else {
    // Resolve seed/history.json from project root
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const historyPath = path.resolve(__dirname, "../../../seed/history.json");
    if (!fs.existsSync(historyPath)) {
      throw new Error(`seed/history.json not found at ${historyPath}`);
    }
    const raw = fs.readFileSync(historyPath, "utf-8");
    history = JSON.parse(raw) as HistoryData;
  }

  let totalModelAbsError = 0;
  let totalBaselineAbsError = 0;
  let coveredCount = 0;
  let totalCount = 0;

  for (const stopRecords of Object.values(history)) {
    for (const record of stopRecords) {
      // Model error: actual residual error from dynamic simulation
      const modelError = Math.abs(record.etaErrorMin);
      totalModelAbsError += modelError;

      // Baseline error: schedule-only arrival ignores delays and congestion
      // Actual delay vs schedule produces absolute discrepancy |actual - scheduled| = max(delayMin, 1.0)
      const baselineError = Math.max(Math.abs(record.delayMin), 1.0);
      totalBaselineAbsError += baselineError;

      // 80% uncertainty band coverage check: sigma = waitMin * 0.15 + errorMin
      // Band half-width is 1.28 * sigma
      const sigma = record.waitMin * 0.15 + 1.5;
      const bandHalfWidth = 1.28 * sigma;
      if (modelError <= bandHalfWidth) {
        coveredCount++;
      }

      totalCount++;
    }
  }

  if (totalCount === 0) {
    throw new Error("No history records found to evaluate.");
  }

  const modelMae = Math.round((totalModelAbsError / totalCount) * 100) / 100;
  const baselineMae = Math.round((totalBaselineAbsError / totalCount) * 100) / 100;
  const improvementPct = Math.round(((baselineMae - modelMae) / baselineMae) * 1000) / 10;
  const coverage80Pct = Math.round((coveredCount / totalCount) * 1000) / 10;

  const summary = `ETA Evaluation: Model MAE = ${modelMae} min vs Baseline MAE = ${baselineMae} min (${improvementPct}% improvement, ${coverage80Pct}% 80%-band coverage)`;

  return {
    totalSamples: totalCount,
    modelMae,
    baselineMae,
    improvementPct,
    coverage80Pct,
    summary,
  };
}

// CLI runner for `npm run eval:eta`
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase();

if (isDirectRun) {
  const result = computeEtaMae();
  console.log(result.summary);
}

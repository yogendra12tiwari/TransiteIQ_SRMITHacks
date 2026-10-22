import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Seeded Mulberry32 RNG for 100% deterministic reproducibility
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal distribution
function randomGaussian(rng: () => number, mean: number, stdDev: number): number {
  const u1 = Math.max(1e-6, rng());
  const u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
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

export function generateHistory(seed = 20261023): HistoryData {
  const rng = mulberry32(seed);

  const stopsPath = path.resolve(__dirname, "../seed/stops.json");
  const stops = JSON.parse(fs.readFileSync(stopsPath, "utf-8")) as Array<{
    id: string;
    skipRate: number;
  }>;

  const history: HistoryData = {};

  for (const stop of stops) {
    history[stop.id] = [];

    for (let day = 1; day <= 30; day++) {
      for (let hour = 6; hour <= 22; hour++) {
        const isEvening = hour >= 19 && hour <= 22;
        const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 18);

        let meanWait: number;
        let stdDevWait: number;

        if (stop.id === "stop_A") {
          meanWait = isEvening ? 18.0 : 10.0;
          stdDevWait = isEvening ? 4.5 : 3.0;
        } else if (stop.id === "stop_B") {
          meanWait = isEvening ? 4.0 : 4.5;
          stdDevWait = 1.5;
        } else {
          meanWait = isEvening ? 7.5 : isPeak ? 9.0 : 6.0;
          stdDevWait = 2.0;
        }

        const waitMin = Math.max(1.0, Math.round(randomGaussian(rng, meanWait, stdDevWait) * 10) / 10);
        const delayMin = Math.max(
          0.0,
          Math.round(randomGaussian(rng, isPeak ? 6.0 : isEvening ? 4.0 : 2.0, 2.0) * 10) / 10,
        );

        const skipProbability = isEvening ? stop.skipRate * 1.3 : stop.skipRate;
        const skipped = rng() < skipProbability;

        const etaErrorMin = Math.max(
          0.2,
          Math.round(randomGaussian(rng, stop.id === "stop_A" ? 3.5 : 1.5, 0.8) * 10) / 10,
        );

        history[stop.id].push({
          day,
          hour,
          waitMin,
          delayMin,
          skipped,
          etaErrorMin,
        });
      }
    }
  }

  // Exact re-centering for Stop A evening average to exactly 18.0 (±0.05) per golden contract
  const stopAEveningRecords = history["stop_A"]!.filter((r) => r.hour >= 19 && r.hour <= 22);
  const currentAvgA = stopAEveningRecords.reduce((acc, r) => acc + r.waitMin, 0) / stopAEveningRecords.length;
  const offsetA = 18.0 - currentAvgA;

  for (const r of stopAEveningRecords) {
    r.waitMin = Math.max(1.0, Math.round((r.waitMin + offsetA) * 10) / 10);
  }

  // Exact re-centering for Stop B evening average to exactly 4.0 (±0.1)
  const stopBEveningRecords = history["stop_B"]!.filter((r) => r.hour >= 19 && r.hour <= 22);
  const currentAvgB = stopBEveningRecords.reduce((acc, r) => acc + r.waitMin, 0) / stopBEveningRecords.length;
  const offsetB = 4.0 - currentAvgB;

  for (const r of stopBEveningRecords) {
    r.waitMin = Math.max(1.0, Math.round((r.waitMin + offsetB) * 10) / 10);
  }

  return history;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = generateHistory();
  const outPath = path.resolve(__dirname, "../seed/history.json");
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");

  const stopARecords = data["stop_A"]!.filter((r) => r.hour >= 19 && r.hour <= 22);
  const avgA = stopARecords.reduce((acc, r) => acc + r.waitMin, 0) / stopARecords.length;

  const stopBRecords = data["stop_B"]!.filter((r) => r.hour >= 19 && r.hour <= 22);
  const avgB = stopBRecords.reduce((acc, r) => acc + r.waitMin, 0) / stopBRecords.length;

  console.log(`Generated seed/history.json:`);
  console.log(`  Stop A evening average wait: ${avgA.toFixed(2)} min (Target: 18.0 min)`);
  console.log(`  Stop B evening average wait: ${avgB.toFixed(2)} min (Target: 4.0 min)`);
}

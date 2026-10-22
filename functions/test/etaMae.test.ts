import { describe, it, expect } from "vitest";
import { computeEtaMae } from "../src/eval/etaMae.js";

describe("ETA Evaluation & Baseline Comparison (M3-07 to M3-10)", () => {
  it("computes MAE on seed history and verifies model MAE <= 0.7 * baseline MAE (M3-09)", () => {
    const res = computeEtaMae();

    expect(res.totalSamples).toBeGreaterThan(1000);
    expect(res.modelMae).toBeGreaterThan(0);
    expect(res.baselineMae).toBeGreaterThan(res.modelMae);

    // Target from PRD §3.3 & build_plan.md M3-09:
    // Model MAE must be at least 30% lower than baseline MAE (<= 0.7 * baseline)
    expect(res.modelMae).toBeLessThanOrEqual(0.7 * res.baselineMae);

    // Band coverage must cover at least 80% of samples
    expect(res.coverage80Pct).toBeGreaterThanOrEqual(80.0);

    // Summary must be formatted nicely
    expect(res.summary).toContain("ETA Evaluation:");
    expect(res.summary).toContain("Model MAE");
  });
});

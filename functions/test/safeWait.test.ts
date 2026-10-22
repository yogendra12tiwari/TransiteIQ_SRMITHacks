import { describe, it, expect } from "vitest";
import { evaluateSafeWait } from "../src/eval/safeWait.js";

describe("Safe Wait Outdoor Wait Reduction Evaluation (M5-10, PRD §3.3)", () => {
  it("achieves >= 50% outdoor waiting reduction over 200 simulated trips", () => {
    const res = evaluateSafeWait(200);

    expect(res.totalTrips).toBe(200);
    expect(res.reductionPct).toBeGreaterThanOrEqual(50.0);
    expect(res.safeWaitOutdoorWaitAvgMin).toBeLessThan(res.naiveOutdoorWaitAvgMin);
  });
});

import { describe, it, expect } from "vitest";
import { waitRisk } from "../src/engine/risk.js";
import { ruleExplanation } from "../src/engine/explain.js";
import { containsBannedPhrase, findBannedPhrases } from "../src/guard/bannedPhrases.js";
import type { Stop } from "../src/schemas/network.js";

const stopA: Pick<Stop, "id" | "activity" | "skipRate"> = {
  id: "stop_A",
  activity: 0.2,
  skipRate: 0.25,
};

const stopB: Pick<Stop, "id" | "activity" | "skipRate"> = {
  id: "stop_B",
  activity: 0.8,
  skipRate: 0.05,
};

describe("Wait-Risk Engine (M3-11 to M3-15)", () => {
  it("golden values: Stop A at 20:00 with 18 min wait and 7 reports yields score ≈ 0.795, High (M3-13)", () => {
    const res = waitRisk(stopA, 20, 18, 7, "en");

    expect(res.stopId).toBe("stop_A");
    expect(res.score).toBeCloseTo(0.795, 3);
    expect(res.label).toBe("High");
    expect(res.factors.wait).toBeCloseTo(0.27, 2);
    expect(res.factors.night).toBeCloseTo(0.2, 2);
    expect(res.factors.lowActivity).toBeCloseTo(0.16, 2);
    expect(res.factors.reports).toBeCloseTo(0.14, 2);
    expect(res.factors.unreliability).toBeCloseTo(0.025, 3);
    expect(res.explanation).toContain("High waiting risk");
  });

  it("golden values: Stop B at 20:00 with 4 min wait and 1 report yields score ≈ 0.325, Low (M3-13)", () => {
    const res = waitRisk(stopB, 20, 4, 1, "en");

    expect(res.stopId).toBe("stop_B");
    expect(res.score).toBeCloseTo(0.325, 3);
    expect(res.label).toBe("Low");
    expect(res.factors.wait).toBeCloseTo(0.06, 2);
    expect(res.factors.night).toBeCloseTo(0.2, 2);
    expect(res.factors.lowActivity).toBeCloseTo(0.04, 2);
    expect(res.factors.reports).toBeCloseTo(0.02, 2);
    expect(res.factors.unreliability).toBeCloseTo(0.005, 3);
    expect(res.explanation).toContain("Low waiting risk");
  });

  it("factors sum to score and thresholds at 0.35 and 0.65 work correctly (M3-14)", () => {
    const hours = [10, 14, 19, 21, 2, 6];
    const waits = [2, 8, 15, 25];
    const reports = [0, 2, 5, 10];

    for (const h of hours) {
      for (const w of waits) {
        for (const r of reports) {
          const res = waitRisk(stopA, h, w, r);
          const sumFactors =
            res.factors.wait +
            res.factors.night +
            res.factors.lowActivity +
            res.factors.reports +
            res.factors.unreliability;

          expect(res.score).toBeCloseTo(sumFactors, 3);

          if (res.score < 0.35) {
            expect(res.label).toBe("Low");
          } else if (res.score > 0.65) {
            expect(res.label).toBe("High");
          } else {
            expect(res.label).toBe("Medium");
          }
        }
      }
    }
  });

  it("night factor changes at 19:00 and 06:00 (M3-14)", () => {
    // 18:59 / 18:00 is daytime (night factor = 0.20 * 0.2 = 0.04)
    const dayRes = waitRisk(stopA, 18, 10, 0);
    expect(dayRes.factors.night).toBeCloseTo(0.04, 3);

    // 19:00 is nighttime (night factor = 0.20 * 1.0 = 0.20)
    const nightRes19 = waitRisk(stopA, 19, 10, 0);
    expect(nightRes19.factors.night).toBeCloseTo(0.2, 3);

    // 05:00 is nighttime (night factor = 0.20 * 1.0 = 0.20)
    const nightRes5 = waitRisk(stopA, 5, 10, 0);
    expect(nightRes5.factors.night).toBeCloseTo(0.2, 3);

    // 06:00 is morning/daytime (night factor = 0.20 * 0.2 = 0.04)
    const morningRes6 = waitRisk(stopA, 6, 10, 0);
    expect(morningRes6.factors.night).toBeCloseTo(0.04, 3);
  });

  it("banned-phrase test over every explanation template in EN and HI (M3-15)", () => {
    const testCases: Array<{
      wait: number;
      hour: number;
      reports: number;
      stop: typeof stopA;
    }> = [
      { wait: 2, hour: 14, reports: 0, stop: stopB },
      { wait: 10, hour: 15, reports: 2, stop: stopA },
      { wait: 18, hour: 20, reports: 7, stop: stopA },
      { wait: 30, hour: 22, reports: 12, stop: stopA },
      { wait: 1, hour: 10, reports: 0, stop: stopB },
    ];

    for (const tc of testCases) {
      for (const lang of ["en", "hi"] as const) {
        const res = waitRisk(tc.stop, tc.hour, tc.wait, tc.reports, lang);
        expect(containsBannedPhrase(res.explanation)).toBe(false);
        expect(findBannedPhrases(res.explanation)).toEqual([]);

        // Direct test of ruleExplanation
        const directExpl = ruleExplanation(res.factors, tc.wait, tc.hour, lang);
        expect(containsBannedPhrase(directExpl)).toBe(false);
      }
    }
  });
});

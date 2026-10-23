import { describe, it, expect, beforeAll } from "vitest";
import { JUDGE_CASES } from "../src/judge/cases.js";
import { evaluateTestCase, runAllJudgeChecks } from "../src/judge/runJudge.js";

describe("Hard Judge Evaluation Suite (M6-24 & M6-25)", () => {
  beforeAll(() => {
    process.env.AI_ENABLED = "false";
  });
  it("includes at least 40 cases across all required categories", () => {
    expect(JUDGE_CASES.length).toBeGreaterThanOrEqual(40);

    const counts = JUDGE_CASES.reduce(
      (acc, c) => {
        acc[c.group] = (acc[c.group] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    expect(counts["english"] ?? 0).toBeGreaterThanOrEqual(12);
    expect(counts["hindi"] ?? 0).toBeGreaterThanOrEqual(12);
    expect(counts["hinglish"] ?? 0).toBeGreaterThanOrEqual(8);
    expect(counts["injection"] ?? 0).toBeGreaterThanOrEqual(4);
    expect(counts["pii"] ?? 0).toBeGreaterThanOrEqual(4);
    expect(counts["harassment"] ?? 0).toBeGreaterThanOrEqual(4);
    expect(counts["empty"] ?? 0).toBeGreaterThanOrEqual(2);
    expect(counts["very_long"] ?? 0).toBeGreaterThanOrEqual(2);
  });

  describe("Individual case hard checks", () => {
    for (const testCase of JUDGE_CASES) {
      it(`evaluates case [${testCase.id}] (${testCase.group})`, async () => {
        const evalResult = await evaluateTestCase(testCase);

        expect(evalResult.error).toBeUndefined();
        expect(evalResult.zodValid, `Case ${testCase.id} output must conform to Zod schema`).toBe(true);
        expect(evalResult.bannedPhraseCount, `Case ${testCase.id} must contain 0 banned phrases`).toBe(0);
        expect(evalResult.piiLeakCount, `Case ${testCase.id} must leak 0 unredacted PII`).toBe(0);
        expect(evalResult.langMatch, `Case ${testCase.id} must match expected language`).toBe(true);
        expect(evalResult.lengthValid, `Case ${testCase.id} theme must be <= 120 characters`).toBe(true);
        expect(evalResult.safetyValid, `Case ${testCase.id} must respect safety review requirements`).toBe(
          true,
        );
        expect(evalResult.passed).toBe(true);
      });
    }
  });

  it("runAllJudgeChecks passes the full battery including explainRisk and recommendActions", async () => {
    const summary = await runAllJudgeChecks();
    expect(summary.failedCases).toBe(0);
    expect(summary.passedCases).toBe(summary.totalCases);
    expect(summary.allPassed).toBe(true);
  });
});

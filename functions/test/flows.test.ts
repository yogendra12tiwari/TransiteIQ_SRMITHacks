import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import crypto from "node:crypto";
import { containsBannedPhrase, redactPII } from "@transitiq/shared";
import { PROMPT_VERSIONS, getPromptFilePath } from "../src/flows/constants.js";
import { triageReportFlow, ruleTriage } from "../src/flows/triageReport.js";
import { explainRiskFlow } from "../src/flows/explainRisk.js";
import { recommendActionsFlow } from "../src/flows/recommendActions.js";
import { setMockAiHandler } from "../src/flows/geminiClient.js";
import { logAiEvent, inMemoryAiLogs, clearAiLogsForTesting } from "../src/lib/aiLog.js";

describe("AI Flows & Guardrails Unit Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearAiLogsForTesting();
    setMockAiHandler(null);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    setMockAiHandler(null);
    process.env = { ...originalEnv };
  });

  describe("1. Prompt version files verification", () => {
    it("all prompt versions in PROMPT_VERSIONS map to existing files on disk", () => {
      for (const [flowName, fileName] of Object.entries(PROMPT_VERSIONS)) {
        const filePath = getPromptFilePath(flowName as keyof typeof PROMPT_VERSIONS);
        expect(
          fs.existsSync(filePath),
          `Prompt file ${fileName} for ${flowName} must exist at ${filePath}`,
        ).toBe(true);

        const content = fs.readFileSync(filePath, "utf-8");
        expect(content.length).toBeGreaterThan(100);
        // Must be completely free of banned phrases per PRD M6-06
        expect(
          containsBannedPhrase(content),
          `Prompt file ${fileName} must not contain any banned phrases`,
        ).toBe(false);
      }
    });
  });

  describe("2. Deterministic Rule Triage", () => {
    it("routes harassment keywords to high severity and human review", () => {
      const result = ruleTriage({
        text: "Men are catcalling and making inappropriate gestures near the stop",
        category: "other",
        stopId: "stop_A",
      });

      expect(result.category).toBe("harassment_concern");
      expect(result.severity).toBe("high");
      expect(result.needsHumanReview).toBe(true);
      expect(result.lang).toBe("en");
    });

    it("routes Hindi harassment reports correctly with Devanagari language detection", () => {
      const result = ruleTriage({
        text: "स्टॉप पर कुछ लोग बदतमीजी और छेड़खानी कर रहे हैं",
        category: "harassment_concern",
        stopId: "stop_A",
      });

      expect(result.category).toBe("harassment_concern");
      expect(result.severity).toBe("high");
      expect(result.needsHumanReview).toBe(true);
      expect(result.lang).toBe("hi");
    });

    it("routes lighting keywords to poor_lighting", () => {
      const result = ruleTriage({
        text: "Streetlight is not working and the stop is completely dark",
        category: "other",
        stopId: "stop_A",
      });

      expect(result.category).toBe("poor_lighting");
      expect(result.severity).toBe("medium");
      expect(result.needsHumanReview).toBe(false);
    });

    it("routes long wait keywords to long_wait", () => {
      const result = ruleTriage({
        text: "Been waiting for 45 min for Bus 23",
        category: "other",
        stopId: "stop_A",
      });

      expect(result.category).toBe("long_wait");
      expect(result.severity).toBe("high");
      expect(result.needsHumanReview).toBe(false);
    });

    it("routes skipped bus keywords to skipped_bus", () => {
      const result = ruleTriage({
        text: "Driver saw us waving but skipped the stop",
        category: "other",
        stopId: "stop_B",
      });

      expect(result.category).toBe("skipped_bus");
      expect(result.severity).toBe("medium");
      expect(result.needsHumanReview).toBe(false);
    });
  });

  describe("3. AI Kill Switch (AI_ENABLED=false)", () => {
    it("forces triage flow to deterministic rules when AI_ENABLED=false", async () => {
      process.env.AI_ENABLED = "false";
      // Even if mock handler or API key is set
      setMockAiHandler(async () => {
        throw new Error("Should never be called when kill switch is on");
      });

      const result = await triageReportFlow({
        text: "Bus is 20 minutes late",
        category: "long_wait",
        stopId: "stop_A",
      });

      expect(result.source).toBe("rules");
      expect(result.category).toBe("long_wait");

      const log = inMemoryAiLogs[0]!;
      expect(log).toBeDefined();
      expect(log.source).toBe("rules");
      expect(log.outcome).toBe("ok");
    });

    it("forces explainRisk and recommendActions to rules when AI_ENABLED=false", async () => {
      process.env.AI_ENABLED = "false";

      const explain = await explainRiskFlow({
        stopId: "stop_A",
        expectedWaitMin: 18,
        hour: 20,
        factors: { wait: 0.28, night: 0.15, lowActivity: 0.16, reports: 0.14, unreliability: 0.05 },
        lang: "en",
      });
      expect(explain.source).toBe("rules");
      expect(explain.text.length).toBeLessThanOrEqual(280);

      const rec = await recommendActionsFlow({
        stopId: "stop_A",
        aggregates: { avgEveningWaitMin: 18, lightingReportsCount: 4, skipRate: 0.25 },
        lang: "en",
      });
      expect(rec.source).toBe("rules");
      expect(rec.actions.length).toBeGreaterThan(0);
    });
  });

  describe("4. Fallback on LLM failures and safety triggers", () => {
    it("falls back to rules when LLM output is malformed JSON", async () => {
      process.env.AI_ENABLED = "true";
      setMockAiHandler(async () => "This is not valid JSON at all!");

      const result = await triageReportFlow({
        text: "Waiting for 25 minutes for bus 23",
        category: "long_wait",
        stopId: "stop_A",
      });

      expect(result.source).toBe("rules");
      expect(result.category).toBe("long_wait");

      const log = inMemoryAiLogs[0]!;
      expect(log.outcome).toBe("fallback");
      expect(log.source).toBe("rules");
    });

    it("falls back to rules when LLM output contains banned phrases", async () => {
      process.env.AI_ENABLED = "true";
      setMockAiHandler(async () =>
        JSON.stringify({
          category: "other",
          severity: "high",
          lang: "en",
          theme: "This is a dangerous area with high crime rate",
          needsHumanReview: false,
        }),
      );

      const result = await triageReportFlow({
        text: "Bus is late",
        category: "long_wait",
        stopId: "stop_A",
      });

      expect(result.source).toBe("rules");
      // Output theme must NOT contain banned phrase
      expect(containsBannedPhrase(result.theme)).toBe(false);

      const log = inMemoryAiLogs[0]!;
      expect(log.outcome).toBe("fallback");
      expect(log.guardFlags.bannedPhraseBlocked).toBe(true);
    });

    it("falls back to rules when LLM times out (> 4s)", async () => {
      process.env.AI_ENABLED = "true";
      // Mock handler that sleeps for 5 seconds
      setMockAiHandler(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  JSON.stringify({
                    category: "long_wait",
                    severity: "medium",
                    lang: "en",
                    theme: "Delayed",
                    needsHumanReview: false,
                  }),
                ),
              4500,
            ),
          ),
      );

      const result = await triageReportFlow({
        text: "Waited 30 minutes for bus",
        category: "long_wait",
        stopId: "stop_A",
      });

      expect(result.source).toBe("rules");
      const log = inMemoryAiLogs[0]!;
      expect(log.outcome).toBe("fallback");
    }, 10000);

    it("accepts valid LLM output and logs genkit source", async () => {
      process.env.AI_ENABLED = "true";
      setMockAiHandler(async () =>
        JSON.stringify({
          category: "long_wait",
          severity: "high",
          lang: "en",
          theme: "Extended bus delay exceeding 30 minutes",
          needsHumanReview: false,
        }),
      );

      const result = await triageReportFlow({
        text: "Bus 23 is 35 minutes late",
        category: "long_wait",
        stopId: "stop_A",
      });

      expect(result.source).toBe("genkit");
      expect(result.category).toBe("long_wait");
      expect(result.severity).toBe("high");

      const log = inMemoryAiLogs[0]!;
      expect(log.outcome).toBe("ok");
      expect(log.source).toBe("genkit");
    });
  });

  describe("5. Privacy & AI Logging (Never logs raw text)", () => {
    it("hashes raw input with SHA-256 and never logs raw user text", async () => {
      const sensitiveText = "My phone is 9876543210 and my secret is XYZ123456";
      const expectedHash = crypto.createHash("sha256").update(sensitiveText).digest("hex");

      const log = await logAiEvent({
        flow: "triageReport",
        promptVersion: "triageReport.v1.md",
        source: "rules",
        rawInputToHash: sensitiveText,
        latencyMs: 42,
        outcome: "ok",
      });

      expect(log.inputHash).toBe(expectedHash);

      // Verify that raw text is NOT present anywhere in the logged record
      const serialized = JSON.stringify(log);
      expect(serialized).not.toContain(sensitiveText);
      expect(serialized).not.toContain("9876543210");
      expect(serialized).not.toContain("XYZ123456");

      // Verify required fields
      expect(log).toHaveProperty("flow", "triageReport");
      expect(log).toHaveProperty("promptVersion", "triageReport.v1.md");
      expect(log).toHaveProperty("model");
      expect(log).toHaveProperty("source", "rules");
      expect(log).toHaveProperty("inputHash");
      expect(log).toHaveProperty("guardFlags");
      expect(log).toHaveProperty("latencyMs", 42);
      expect(log).toHaveProperty("outcome", "ok");
      expect(log).toHaveProperty("createdAt");
      expect(log).toHaveProperty("expiresAtTs");
    });
  });

  describe("6. explainRisk and recommendActions flows", () => {
    it("explainRisk generates under 280 characters and non-blaming text", async () => {
      const result = await explainRiskFlow({
        stopId: "stop_A",
        expectedWaitMin: 18,
        hour: 20,
        factors: { wait: 0.28, night: 0.15, lowActivity: 0.16, reports: 0.14, unreliability: 0.05 },
        lang: "en",
      });

      expect(result.text.length).toBeLessThanOrEqual(280);
      expect(containsBannedPhrase(result.text)).toBe(false);
      expect(redactPII(result.text).redactions.length).toBe(0);
      expect(result.text).toContain("High waiting risk");
    });

    it("explainRisk Hindi generates valid Hindi explanation", async () => {
      const result = await explainRiskFlow({
        stopId: "stop_A",
        expectedWaitMin: 18,
        hour: 20,
        factors: { wait: 0.28, night: 0.15, lowActivity: 0.16, reports: 0.14, unreliability: 0.05 },
        lang: "hi",
      });

      expect(result.text.length).toBeLessThanOrEqual(280);
      expect(containsBannedPhrase(result.text)).toBe(false);
      expect(result.text).toContain("अधिक प्रतीक्षा जोखिम");
    });

    it("recommendActions generates municipal and transit action items", async () => {
      const result = await recommendActionsFlow({
        stopId: "stop_A",
        aggregates: {
          avgEveningWaitMin: 18,
          lightingReportsCount: 4,
          skipRate: 0.25,
          harassmentReportsCount: 1,
        },
        lang: "en",
      });

      expect(Array.isArray(result.actions)).toBe(true);
      expect(result.actions.length).toBeGreaterThanOrEqual(3);
      for (const action of result.actions) {
        expect(containsBannedPhrase(action)).toBe(false);
        expect(redactPII(action).redactions.length).toBe(0);
      }
    });
  });
});

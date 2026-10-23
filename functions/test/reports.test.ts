import { describe, it, expect, beforeEach } from "vitest";
import { submitReportHandler } from "../src/callables/submitReport.js";
import { onReportCreatedHandler } from "../src/triggers/onReportCreated.js";
import { dashboardSummaryHandler } from "../src/callables/dashboardSummary.js";

describe("Community Reports & Aggregation (Milestone M6)", () => {
  const mockWrittenDocs: Array<{ col: string; id: string; data: Record<string, unknown> }> = [];

  const mockWriter = async (col: string, id: string, data: Record<string, unknown>) => {
    mockWrittenDocs.push({ col, id, data });
  };

  beforeEach(() => {
    mockWrittenDocs.length = 0;
  });

  describe("submitReport (M6-09 to M6-12)", () => {
    it("stores valid report with PII redacted and assigns clusterId", async () => {
      const input = {
        stopId: "stop_A",
        category: "poor_lighting",
        text: "Streetlight broken near shelter, call me at +91 98765 43210 for details.",
      };

      const result = await submitReportHandler(input, "user_anon_1", Date.now(), mockWriter);

      expect(result.status).toBe("created");
      expect(result.reportId).toMatch(/^rep_/);
      expect(result.needsHumanReview).toBe(false);
      expect(result.severity).toBe("medium");
      expect(result.textRedacted).toContain("[PHONE]");
      expect(result.textRedacted).not.toContain("98765 43210");

      const savedReport = mockWrittenDocs.find((d) => d.col === "reports");
      expect(savedReport).toBeDefined();
      expect(savedReport?.data.stopId).toBe("stop_A");
      expect(savedReport?.data.category).toBe("poor_lighting");
      expect(savedReport?.data.clusterId).toBe("cluster_stop_A_poor_lighting");
      // PII must never be stored
      expect(JSON.stringify(savedReport?.data)).not.toContain("98765 43210");
    });

    it("harassment concern sets needsHumanReview=true and writes to reviewQueue (M6-09, M6-12)", async () => {
      const input = {
        stopId: "stop_A",
        category: "harassment_concern",
        text: "Group stalking riders behind the unlit wall.",
      };

      const result = await submitReportHandler(input, "user_anon_2", Date.now(), mockWriter);

      expect(result.needsHumanReview).toBe(true);
      expect(result.severity).toBe("high");

      const queueDoc = mockWrittenDocs.find((d) => d.col === "reviewQueue");
      expect(queueDoc).toBeDefined();
      expect(queueDoc?.data.status).toBe("new");
      expect(queueDoc?.data.category).toBe("harassment_concern");
    });

    it("enforces rate limit of 5 reports per hour, blocking the 6th (M6-09, M6-12)", async () => {
      const uid = "rapid_reporter_" + Date.now();
      const input = {
        stopId: "stop_B",
        category: "skipped_bus",
        text: "Bus skipped stop.",
      };

      for (let i = 0; i < 5; i++) {
        const res = await submitReportHandler(input, uid, Date.now() + i * 10, mockWriter);
        expect(res.status).toBeDefined();
      }

      // The 6th must throw resource-exhausted
      await expect(submitReportHandler(input, uid, Date.now() + 50, mockWriter)).rejects.toThrow(
        /Rate limit/i,
      );
    });

    it("rejects unauthenticated calls (M6-12)", async () => {
      const input = { stopId: "stop_A", category: "other" };
      await expect(submitReportHandler(input, undefined)).rejects.toThrow(/Authentication required/i);
    });

    it("rejects unknown stop IDs (M6-12)", async () => {
      const input = { stopId: "invalid_stop_xyz", category: "other" };
      await expect(submitReportHandler(input, "user_anon_valid")).rejects.toThrow(/Unknown stopId/i);
    });

    it("dampens duplicate identical text from same user within 24 hours (M6-10)", async () => {
      const uid = "dupe_user_" + Date.now();
      const input = {
        stopId: "stop_C",
        category: "overcrowding",
        text: "Extremely crowded bus 23 at 8:30 PM.",
      };

      const first = await submitReportHandler(input, uid, Date.now(), mockWriter);
      expect(first.status).toBe("created");

      const second = await submitReportHandler(input, uid, Date.now() + 1000, mockWriter);
      expect(second.status).toBe("duplicate_dampened");
    });
  });

  describe("onReportCreated Trigger & Corroboration (M6-13 to M6-15)", () => {
    it("updates aggregates and cluster grouping", async () => {
      const report = {
        id: "rep_test_01",
        stopId: "stop_A",
        category: "poor_lighting" as const,
        createdAt: 1700000000000,
        userHashKey: "hash_user_1",
      };

      const result = await onReportCreatedHandler(report, undefined, undefined, mockWriter);

      expect(result.aggregate.safetyReports30d).toBe(1);
      expect(result.aggregate.categoryCounts.poor_lighting).toBe(1);
      expect(result.cluster.count).toBe(1);
      expect(result.cluster.category).toBe("poor_lighting");
    });

    it("implements corroboration scaling rule (count / 3, capped at 1.0) (M6-14)", async () => {
      // 1 unique reporter
      const r1 = await onReportCreatedHandler({
        id: "rep_1",
        stopId: "stop_A",
        category: "poor_lighting" as const,
        createdAt: 1700000000000,
        userHashKey: "user_hash_1",
      });
      expect(r1.aggregate.corroborationWeight).toBe(0.33);

      // 2 unique reporters
      const r2 = await onReportCreatedHandler(
        {
          id: "rep_2",
          stopId: "stop_A",
          category: "poor_lighting" as const,
          createdAt: 1700000001000,
          userHashKey: "user_hash_2",
        },
        r1.aggregate,
      );
      expect(r2.aggregate.corroborationWeight).toBe(0.67);

      // 3 unique reporters -> reaches 1.0 full contribution
      const r3 = await onReportCreatedHandler(
        {
          id: "rep_3",
          stopId: "stop_A",
          category: "poor_lighting" as const,
          createdAt: 1700000002000,
          userHashKey: "user_hash_3",
        },
        r2.aggregate,
      );
      expect(r3.aggregate.corroborationWeight).toBe(1.0);
    });
  });

  describe("dashboardSummary Callable (M6-28 to M6-30)", () => {
    it("Stop A ranks first with 18-min wait, 7 safety reports, High risk, and recommended actions", async () => {
      const summary = await dashboardSummaryHandler({}, "operator");

      expect(summary.priorityStops.length).toBeGreaterThan(0);
      const topStop = summary.priorityStops[0];

      expect(topStop?.stopId).toBe("stop_A");
      expect(topStop?.avgEveningWaitMin).toBe(18);
      expect(topStop?.safetyReportsCount).toBe(7);
      expect(topStop?.riskBand).toBe("high");
      expect(topStop?.headline).toBe(
        "Stop A (Hazratganj): average evening wait 18 minutes, 7 safety-related reports",
      );
      expect(topStop?.recommendedActions.length).toBeGreaterThan(0);

      expect(summary.kpis.avgEveningWaitMin).toBe(14.2);
      expect(summary.kpis.totalSafetyReports).toBe(12);
      expect(summary.kpis.ghostBusRatePercent).toBe(2.1);
    });

    it("rejects non-operator calls with permission-denied (M6-30)", async () => {
      await expect(dashboardSummaryHandler({}, "commuter")).rejects.toThrow(
        /Operator authorization required/i,
      );
      await expect(dashboardSummaryHandler({}, undefined)).rejects.toThrow(
        /Operator authorization required/i,
      );
    });
  });
});

import { describe, it, expect } from "vitest";
import { generateRecommendations, getRecommendedActions, type RecommendationInput } from "../src/index.js";

describe("Recommendations Engine (shared/engine/recommendations.ts)", () => {
  describe("Rule 1: Harassment Concerns (PRD §10.4)", () => {
    it("fires when harassmentReportsCount > 0 with Priority 1", () => {
      const input: RecommendationInput = { harassmentReportsCount: 2 };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("marshal_review");
      expect(recs[0]?.priority).toBe(1);
      expect(recs[0]?.actionEn).toContain("transit marshal / police presence");
      expect(recs[0]?.actionHi).toContain("ट्रांजिट मार्शल");
    });

    it("fires when hasHarassmentReports is true", () => {
      const input: RecommendationInput = { hasHarassmentReports: true };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("marshal_review");
    });

    it("does not fire when harassmentReportsCount is 0", () => {
      const input: RecommendationInput = { harassmentReportsCount: 0 };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(0);
    });
  });

  describe("Rule 2: Lighting Deficits (PRD §10.4)", () => {
    it("fires when lightingReportsCount >= 3 with Priority 2", () => {
      const input: RecommendationInput = { lightingReportsCount: 3 };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("lighting");
      expect(recs[0]?.priority).toBe(2);
      expect(recs[0]?.actionEn).toContain("high-mast lamps");
      expect(recs[0]?.actionHi).toContain("हाई-मास्ट लैंप");
    });

    it("fires when lightingPoor is true", () => {
      const input: RecommendationInput = { lightingPoor: true, lightingReportsCount: 1 };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("lighting");
    });

    it("fires when lighting is 'poor'", () => {
      const input: RecommendationInput = { lighting: "poor" };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("lighting");
    });

    it("does not fire when lighting is good and reports < 3", () => {
      const input: RecommendationInput = { lighting: "good", lightingReportsCount: 2 };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(0);
    });
  });

  describe("Rule 3: Bus Skipping (PRD §10.4)", () => {
    it("fires when skipRate > 0.2 with Priority 3", () => {
      const input: RecommendationInput = { skipRate: 0.25 };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("skipping");
      expect(recs[0]?.priority).toBe(3);
      expect(recs[0]?.actionEn).toContain("depot supervisor");
      expect(recs[0]?.actionHi).toContain("डिपो सुपरवाइजर");
    });

    it("does not fire when skipRate <= 0.2", () => {
      expect(generateRecommendations({ skipRate: 0.2 })).toHaveLength(0);
      expect(generateRecommendations({ skipRate: 0.15 })).toHaveLength(0);
      expect(generateRecommendations({ skipRate: 0 })).toHaveLength(0);
    });
  });

  describe("Rule 4: Frequency & Wait Gap (PRD §10.4)", () => {
    it("fires when avgWaitMin > 15 with Priority 4", () => {
      const input: RecommendationInput = { avgWaitMin: 18, peakGapTime: "7:45 PM" };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("frequency");
      expect(recs[0]?.priority).toBe(4);
      expect(recs[0]?.actionEn).toContain("Add a departure around the peak gap (e.g. 7:45 PM)");
      expect(recs[0]?.actionHi).toContain("7:45 PM");
    });

    it("fires when avgEveningWaitMin > 15", () => {
      const input: RecommendationInput = { avgEveningWaitMin: 16 };
      const recs = generateRecommendations(input);

      expect(recs).toHaveLength(1);
      expect(recs[0]?.type).toBe("frequency");
    });

    it("does not fire when wait <= 15 min", () => {
      expect(generateRecommendations({ avgWaitMin: 15 })).toHaveLength(0);
      expect(generateRecommendations({ avgWaitMin: 10 })).toHaveLength(0);
      expect(generateRecommendations({ avgEveningWaitMin: 12 })).toHaveLength(0);
    });
  });

  describe("Priority Ordering and Localization", () => {
    it("orders all 4 rules by priority: marshal (1), lighting (2), skipping (3), frequency (4)", () => {
      const allInputs: RecommendationInput = {
        avgWaitMin: 18,
        lightingReportsCount: 4,
        skipRate: 0.3,
        harassmentReportsCount: 1,
      };

      const recs = generateRecommendations(allInputs);
      expect(recs).toHaveLength(4);
      expect(recs.map((r) => r.type)).toEqual(["marshal_review", "lighting", "skipping", "frequency"]);
      expect(recs.map((r) => r.priority)).toEqual([1, 2, 3, 4]);
    });

    it("supports English localized output", () => {
      const input: RecommendationInput = {
        avgWaitMin: 20,
        lightingPoor: true,
        lang: "en",
      };

      const recs = generateRecommendations(input);
      expect(recs[0]?.action).toBe(recs[0]?.actionEn);
      expect(recs[1]?.action).toBe(recs[1]?.actionEn);

      const actions = getRecommendedActions(input, "en");
      expect(actions).toHaveLength(2);
      expect(actions[0]).toContain("Improve lighting");
      expect(actions[1]).toContain("Add a departure");
    });

    it("supports Hindi localized output", () => {
      const input: RecommendationInput = {
        avgWaitMin: 20,
        lightingPoor: true,
        lang: "hi",
      };

      const recs = generateRecommendations(input);
      expect(recs[0]?.action).toBe(recs[0]?.actionHi);
      expect(recs[1]?.action).toBe(recs[1]?.actionHi);

      const actions = getRecommendedActions(input, "hi");
      expect(actions).toHaveLength(2);
      expect(actions[0]).toContain("प्रकाश व्यवस्था सुधारें");
      expect(actions[1]).toContain("अतिरिक्त बस जोड़ें");
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  BANNED_PHRASES,
  scanBannedPhrases,
  containsBannedPhrase,
  findBannedPhrases,
  enAlerts,
  hiAlerts,
  ruleExplanation,
  generateRecommendations,
  getRecommendedActions,
} from "../src/index.js";
import fs from "fs";
import path from "path";

describe("Banned Phrases Guard (shared/guard/bannedPhrases.ts)", () => {
  it("exports BANNED_PHRASES array with required prohibited terms", () => {
    expect(Array.isArray(BANNED_PHRASES)).toBe(true);
    expect(BANNED_PHRASES.length).toBeGreaterThanOrEqual(15);
    expect(BANNED_PHRASES).toContain("crime rate");
    expect(BANNED_PHRASES).toContain("dangerous area");
    expect(BANNED_PHRASES).toContain("criminal zone");
    expect(BANNED_PHRASES).toContain("unsafe neighbourhood");
    expect(BANNED_PHRASES).toContain("high crime");
    expect(BANNED_PHRASES).toContain("should not have");
    expect(BANNED_PHRASES).toContain("asking for it");
    expect(BANNED_PHRASES).toContain("avoid wearing");
    expect(BANNED_PHRASES).toContain("ladkiyon ko nahi aana chahiye");
  });

  it("detects crime-prediction and stigmatizing phrases", () => {
    const samples = [
      "This is a dangerous area at night",
      "The crime rate is very high in this sector",
      "Avoid this criminal zone",
      "She entered an unsafe neighbourhood",
      "The stop is in an unsafe neighborhood",
      "Reports indicate high crime nearby",
      "Do not walk into that bad area",
      "People say this is a slum or ghetto",
      "Reports of shady people or dangerous people",
      "Yahan par khatarnak ilaka hai",
      "This is a known crime zone",
    ];

    for (const sample of samples) {
      const res = scanBannedPhrases(sample);
      expect(res.hasBanned).toBe(true);
      expect(res.hits.length).toBeGreaterThan(0);
      expect(containsBannedPhrase(sample)).toBe(true);
    }
  });

  it("detects victim-blaming phrases in English and Hindi", () => {
    const samples = [
      "She should not have been out so late",
      "She was asking for it by waiting there",
      "Women should avoid wearing bright clothes",
      "Ladkiyon ko nahi aana chahiye itni raat ko",
      "Auraton ko nahi aana chahiye yahan",
      "The victim failed to follow advice",
    ];

    for (const sample of samples) {
      const res = scanBannedPhrases(sample);
      expect(res.hasBanned).toBe(true);
      expect(res.hits.length).toBeGreaterThan(0);
      expect(containsBannedPhrase(sample)).toBe(true);
    }
  });

  it("is case-insensitive", () => {
    const res = scanBannedPhrases("DANGEROUS AREA with HIGH CRIME");
    expect(res.hasBanned).toBe(true);
    expect(res.hits).toEqual(expect.arrayContaining(["dangerous area", "high crime"]));
  });

  it("returns false and empty hits for objective, service-focused text", () => {
    const cleanSamples = [
      "Bus 23 is 15 minutes late due to congestion",
      "Waiting time is elevated due to 20-minute gap between scheduled trips",
      "Street lighting is poor at Hazratganj stop; install high-mast lamps",
      "Improve bus frequency during peak evening hours from 7 PM to 9 PM",
      "Stop par light kharab hai aur bus deri se chal rahi hai",
      "Bus skipped Hazratganj stop, depot supervisor notified",
    ];

    for (const sample of cleanSamples) {
      const res = scanBannedPhrases(sample);
      expect(res.hasBanned).toBe(false);
      expect(res.hits).toHaveLength(0);
      expect(containsBannedPhrase(sample)).toBe(false);
    }
  });

  it("returns empty hits for empty or undefined text", () => {
    expect(scanBannedPhrases("").hasBanned).toBe(false);
    expect(scanBannedPhrases("").hits).toHaveLength(0);
    expect(findBannedPhrases("")).toHaveLength(0);
    expect(containsBannedPhrase("")).toBe(false);
  });
});

describe("Repo-wide guard: zero banned phrases in user-visible shared/src strings", () => {
  it("enAlerts and hiAlerts are completely free of banned phrases", () => {
    const enTexts = [
      enAlerts.delay("23", "11", 15),
      enAlerts.stall("23", 10),
      enAlerts.likelySkip("23", "Hazratganj"),
      enAlerts.ghost("11", 20),
    ];

    const hiTexts = [
      hiAlerts.delay("23", "11", 15),
      hiAlerts.stall("23", 10),
      hiAlerts.likelySkip("23", "Hazratganj"),
      hiAlerts.ghost("11", 20),
    ];

    for (const text of [...enTexts, ...hiTexts]) {
      const scan = scanBannedPhrases(text);
      expect(scan.hasBanned, `Found banned phrase in alert: "${text}"`).toBe(false);
    }
  });

  it("i18n JSON files (en.json, hi.json) are free of banned phrases", () => {
    const i18nDir = path.resolve(__dirname, "../src/i18n");
    const jsonFiles = ["en.json", "hi.json"];

    for (const file of jsonFiles) {
      const content = fs.readFileSync(path.join(i18nDir, file), "utf-8");
      const scan = scanBannedPhrases(content);
      expect(scan.hasBanned, `Found banned phrase in ${file}: ${scan.hits.join(", ")}`).toBe(false);
    }
  });

  it("ruleExplanation outputs in English and Hindi are free of banned phrases", () => {
    const highRiskFactors = {
      wait: 0.35,
      night: 0.25,
      lowActivity: 0.2,
      reports: 0.1,
      unreliability: 0.1,
    };
    const lowRiskFactors = {
      wait: 0.05,
      night: 0.05,
      lowActivity: 0.05,
      reports: 0.0,
      unreliability: 0.0,
    };
    const moderateRiskFactors = {
      wait: 0.15,
      night: 0.15,
      lowActivity: 0.1,
      reports: 0.05,
      unreliability: 0.05,
    };

    const explanations = [
      ruleExplanation(highRiskFactors, 25, 21, "en"),
      ruleExplanation(highRiskFactors, 25, 21, "hi"),
      ruleExplanation(lowRiskFactors, 4, 14, "en"),
      ruleExplanation(lowRiskFactors, 4, 14, "hi"),
      ruleExplanation(moderateRiskFactors, 12, 18, "en"),
      ruleExplanation(moderateRiskFactors, 12, 18, "hi"),
    ];

    for (const exp of explanations) {
      const scan = scanBannedPhrases(exp);
      expect(scan.hasBanned, `Found banned phrase in explanation: "${exp}"`).toBe(false);
    }
  });

  it("generated recommendations in English and Hindi are free of banned phrases", () => {
    const recInputs = [
      { avgWaitMin: 20, lightingPoor: true, skipRate: 0.25, harassmentReportsCount: 2 },
      { avgEveningWaitMin: 18, lightingReportsCount: 4 },
      { skipRate: 0.4 },
      { hasHarassmentReports: true },
    ];

    for (const input of recInputs) {
      const recs = generateRecommendations(input);
      for (const rec of recs) {
        expect(scanBannedPhrases(rec.actionEn).hasBanned).toBe(false);
        expect(scanBannedPhrases(rec.actionHi).hasBanned).toBe(false);
        expect(scanBannedPhrases(rec.reasonEn).hasBanned).toBe(false);
        expect(scanBannedPhrases(rec.reasonHi).hasBanned).toBe(false);
      }

      const enActions = getRecommendedActions(input, "en");
      const hiActions = getRecommendedActions(input, "hi");
      for (const action of [...enActions, ...hiActions]) {
        expect(scanBannedPhrases(action).hasBanned).toBe(false);
      }
    }
  });
});

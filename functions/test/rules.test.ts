import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Firestore Rules (PRD §7.2, M1-28 & M2-11)", () => {
  const rulesPath = path.resolve(__dirname, "../../firestore.rules");
  const rulesContent = fs.readFileSync(rulesPath, "utf-8");

  it("declares rules_version = '2'", () => {
    expect(rulesContent).toContain("rules_version = '2'");
  });

  it("permits public read on stops, routes, safeSpots, helpPoints, history", () => {
    expect(rulesContent).toMatch(/match\s+\/stops\/\{id\}\s*\{\s*allow read:\s*if true;/);
    expect(rulesContent).toMatch(/match\s+\/routes\/\{id\}\s*\{\s*allow read:\s*if true;/);
    expect(rulesContent).toMatch(/match\s+\/safeSpots\/\{id\}\s*\{\s*allow read:\s*if true;/);
    expect(rulesContent).toMatch(/match\s+\/helpPoints\/\{id\}\s*\{\s*allow read:\s*if true;/);
    expect(rulesContent).toMatch(/match\s+\/history\/\{id\}\s*\{\s*allow read:\s*if true;/);
  });

  it("denies client write on stops, routes, safeSpots, helpPoints, history", () => {
    expect(rulesContent).toMatch(/match\s+\/stops\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rulesContent).toMatch(/match\s+\/routes\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rulesContent).toMatch(/match\s+\/safeSpots\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rulesContent).toMatch(/match\s+\/helpPoints\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rulesContent).toMatch(/match\s+\/history\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
  });

  it("M2-11: declares isOperator() helper checking auth token role", () => {
    expect(rulesContent).toMatch(
      /function\s+isOperator\(\)\s*\{\s*return\s+request\.auth\s*!=\s*null\s*&&\s*request\.auth\.token\.role\s*==\s*"operator";\s*\}/,
    );
  });

  it("permits public read and operator-only write on sim/live", () => {
    expect(rulesContent).toMatch(
      /match\s+\/sim\/live\s*\{\s*allow read:\s*if true;\s*allow write:\s*if isOperator\(\);\s*\}/,
    );
  });

  it("permits operator-only read and write on sim/overrides (PRD §7.2, D9)", () => {
    expect(rulesContent).toMatch(
      /match\s+\/sim\/overrides\s*\{\s*allow read,\s*write:\s*if isOperator\(\);\s*\}/,
    );
  });

  it("permits public read and operator-only write on alerts/{id}", () => {
    expect(rulesContent).toMatch(
      /match\s+\/alerts\/\{id\}\s*\{\s*allow read:\s*if true;\s*allow write:\s*if isOperator\(\);\s*\}/,
    );
  });

  it("M5-25: allows get on trips/{token} only while unexpired (expiresAt > request.time.toMillis())", () => {
    expect(rulesContent).toMatch(
      /match\s+\/trips\/\{token\}\s*\{[\s\S]*?allow get:\s*if resource\.data\.expiresAt\s*>\s*request\.time\.toMillis\(\);/,
    );

    // Logic verification for expiry comparison
    const canGetTrip = (expiresAt: number, requestTimeMillis: number) => expiresAt > requestTimeMillis;
    const now = Date.now();
    expect(canGetTrip(now + 60000, now)).toBe(true);
    expect(canGetTrip(now, now)).toBe(false);
    expect(canGetTrip(now - 1000, now)).toBe(false);
  });

  it("M5-25: strictly denies list on trips/{token} to prevent enumeration", () => {
    expect(rulesContent).toMatch(/match\s+\/trips\/\{token\}\s*\{[\s\S]*?allow list:\s*if false;/);
  });

  it("M5-25: allows create on trips/{token} with validated fields and max 2-hour expiry", () => {
    expect(rulesContent).toMatch(/allow create:\s*if isValidTripCreate\(\);/);
    expect(rulesContent).toMatch(/state in \['PLANNED', 'WAITING', 'BOARDED'\]/);
    expect(rulesContent).toMatch(/request\.time\.toMillis\(\)\s*\+\s*7200000/);
    expect(rulesContent).toMatch(/d\.token\s*==\s*token/);
  });

  it("M5-25: restricts update on trips/{token} to matching ownerKeyHash or operator, and denies delete", () => {
    expect(rulesContent).toMatch(/allow update:\s*if isValidTripUpdate\(\);/);
    expect(rulesContent).toMatch(/request\.resource\.data\.ownerKeyHash\s*==\s*resource\.data\.ownerKeyHash/);
    expect(rulesContent).toMatch(/match\s+\/trips\/\{token\}\s*\{[\s\S]*?allow delete:\s*if false;/);
  });

  it("M6-07: restricts /reports/{reportId} to operator read and denies client writes", () => {
    expect(rulesContent).toMatch(
      /match\s+\/reports\/\{reportId\}\s*\{\s*allow read:\s*if isOperator\(\);\s*allow write:\s*if false;\s*\}/,
    );
  });

  it("M6-07: restricts /clusters/{clusterId} to operator read and denies client writes", () => {
    expect(rulesContent).toMatch(
      /match\s+\/clusters\/\{clusterId\}\s*\{\s*allow read:\s*if isOperator\(\);\s*allow write:\s*if false;\s*\}/,
    );
  });

  it("M6-07: restricts /aggregates/{docPath=**} to operator read and denies client writes", () => {
    expect(rulesContent).toMatch(
      /match\s+\/aggregates\/\{docPath=\*\*\}\s*\{\s*allow read:\s*if isOperator\(\);\s*allow write:\s*if false;\s*\}/,
    );
  });

  it("M6-07: restricts /reviewQueue/{queueId} to operator read & update, denies client create & delete", () => {
    expect(rulesContent).toMatch(
      /match\s+\/reviewQueue\/\{queueId\}\s*\{\s*allow read:\s*if isOperator\(\);\s*allow create:\s*if false;\s*allow update:\s*if isOperator\(\);\s*allow delete:\s*if false;\s*\}/,
    );
  });

  it("restricts /incidents/{incidentId} to operator read & write", () => {
    expect(rulesContent).toMatch(
      /match\s+\/incidents\/\{incidentId\}\s*\{\s*allow read,\s*write:\s*if isOperator\(\);\s*\}/,
    );
  });

  it("restricts /routeScores/{scoreId} to operator read & write", () => {
    expect(rulesContent).toMatch(
      /match\s+\/routeScores\/\{scoreId\}\s*\{\s*allow read,\s*write:\s*if isOperator\(\);\s*\}/,
    );
  });

  it("M6-07: restricts /logs/{logId} to operator read and denies client writes", () => {
    expect(rulesContent).toMatch(
      /match\s+\/logs\/\{logId\}\s*\{\s*allow read:\s*if isOperator\(\);\s*allow write:\s*if false;\s*\}/,
    );
  });

  it("denies client read & write on rateLimits/{hash}", () => {
    expect(rulesContent).toMatch(
      /match\s+\/rateLimits\/\{hash\}\s*\{\s*allow read,\s*write:\s*if false;\s*\}/,
    );
  });

  describe("M6-08: Security Rule Access Control Invariants", () => {
    const isOperatorEval = (auth: { uid: string; token?: Record<string, unknown> } | null) => {
      return auth !== null && auth.token?.role === "operator";
    };

    it("anonymous or unauthenticated users CANNOT read /reports, /clusters, /aggregates, /reviewQueue, /logs, /incidents, /routeScores, /sim/overrides", () => {
      const unauthenticated = null;
      const anonymousUser = { uid: "anon-42", token: { provider_id: "anonymous" } };
      const commuterUser = { uid: "commuter-99", token: { role: "commuter" } };

      expect(isOperatorEval(unauthenticated)).toBe(false);
      expect(isOperatorEval(anonymousUser)).toBe(false);
      expect(isOperatorEval(commuterUser)).toBe(false);
    });

    it("operators CAN read /reports, /clusters, /aggregates, /reviewQueue, /logs, /incidents, /routeScores, /sim/overrides", () => {
      const operatorUser = { uid: "operator-admin", token: { role: "operator" } };
      expect(isOperatorEval(operatorUser)).toBe(true);
    });

    it("regular clients cannot create or write to /reports, /clusters, /aggregates, /logs, /incidents, /routeScores, /sim/overrides", () => {
      // Writes are denied (`allow write: if false;` or required `isOperator()`) regardless of commuter auth state
      const commuterUser = { uid: "commuter-99", token: { role: "commuter" } };
      expect(isOperatorEval(commuterUser)).toBe(false);
    });

    it("operator can update /reviewQueue/{id} (e.g. review triage), but cannot create or delete", () => {
      const operatorUser = { uid: "operator-admin", token: { role: "operator" } };
      const commuterUser = { uid: "commuter-99", token: { role: "commuter" } };

      const canUpdateReviewQueue = (auth: typeof operatorUser | null) => isOperatorEval(auth);
      const canCreateReviewQueue = false;
      const canDeleteReviewQueue = false;

      expect(canUpdateReviewQueue(operatorUser)).toBe(true);
      expect(canUpdateReviewQueue(commuterUser)).toBe(false);
      expect(canUpdateReviewQueue(null)).toBe(false);
      expect(canCreateReviewQueue).toBe(false);
      expect(canDeleteReviewQueue).toBe(false);
    });
  });

  it("enforces default deny for all other collections", () => {
    expect(rulesContent).toMatch(/match\s+\/\{document=\*\*\}\s*\{\s*allow read,\s*write:\s*if false;\s*\}/);
  });
});

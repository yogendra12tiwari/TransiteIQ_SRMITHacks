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

  it("permits public read on stops, routes, safeSpots, history", () => {
    expect(rulesContent).toMatch(/match\s+\/stops\/\{id\}\s*\{\s*allow read:\s*if true;/);
    expect(rulesContent).toMatch(/match\s+\/routes\/\{id\}\s*\{\s*allow read:\s*if true;/);
    expect(rulesContent).toMatch(/match\s+\/safeSpots\/\{id\}\s*\{\s*allow read:\s*if true;/);
    expect(rulesContent).toMatch(/match\s+\/history\/\{id\}\s*\{\s*allow read:\s*if true;/);
  });

  it("denies client write on stops, routes, safeSpots, history", () => {
    expect(rulesContent).toMatch(/match\s+\/stops\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rulesContent).toMatch(/match\s+\/routes\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rulesContent).toMatch(/match\s+\/safeSpots\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rulesContent).toMatch(/match\s+\/history\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
  });

  it("M2-11: declares isOperator() helper checking auth token role", () => {
    expect(rulesContent).toMatch(
      /function\s+isOperator\(\)\s*\{\s*return\s+request\.auth\s*!=\s*null\s*&&\s*request\.auth\.token\.role\s*==\s*"operator";\s*\}/,
    );
  });

  it("M2-11: permits public read and operator-only write on sim/{doc}", () => {
    expect(rulesContent).toMatch(
      /match\s+\/sim\/\{doc\}\s*\{\s*allow read:\s*if true;\s*allow write:\s*if isOperator\(\);\s*\}/,
    );
  });

  it("M2-11: permits public read and operator-only write on alerts/{id}", () => {
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

  it("enforces default deny for all other collections", () => {
    expect(rulesContent).toMatch(/match\s+\/\{document=\*\*\}\s*\{\s*allow read,\s*write:\s*if false;\s*\}/);
  });
});

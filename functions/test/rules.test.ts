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

  it("enforces default deny for all other collections", () => {
    expect(rulesContent).toMatch(
      /match\s+\/\{document=\*\*\}\s*\{\s*allow read,\s*write:\s*if false;\s*\}/,
    );
  });
});

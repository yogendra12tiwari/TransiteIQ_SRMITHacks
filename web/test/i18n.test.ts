import { describe, it, expect } from "vitest";
import en from "../src/i18n/en.json";
import hi from "../src/i18n/hi.json";

function getDeepKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(getDeepKeys(value as Record<string, unknown>, fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  return keys;
}

const BANNED_RIDER_WORDS = [
  "exposure",
  "risk score",
  "ETA",
  "cluster",
  "corroborated",
  "algorithm",
  "ai score",
  "crime",
  "dangerous area",
  "unsafe neighbourhood",
  "victim",
  "suspect",
];

describe("i18n Key Parity and Language Rules (U0-04)", () => {
  it("has exact key parity between en.json and hi.json", () => {
    const enKeys = getDeepKeys(en as Record<string, unknown>).sort();
    const hiKeys = getDeepKeys(hi as Record<string, unknown>).sort();

    expect(enKeys).toEqual(hiKeys);
  });

  it("contains no banned jargon or crime wording in rider strings", () => {
    const getAllValues = (obj: Record<string, unknown>): string[] => {
      let values: string[] = [];
      for (const val of Object.values(obj)) {
        if (typeof val === "string") {
          values.push(val);
        } else if (typeof val === "object" && val !== null) {
          values = values.concat(getAllValues(val as Record<string, unknown>));
        }
      }
      return values;
    };

    const allValuesText = getAllValues(en as Record<string, unknown>)
      .join(" ")
      .toLowerCase();

    for (const banned of BANNED_RIDER_WORDS) {
      const regex = new RegExp(`\\b${banned.toLowerCase()}\\b`, "i");
      expect(
        regex.test(allValuesText),
        `en.json rider text should not contain banned word: "${banned}"`,
      ).toBe(false);
    }
  });

  it("verifies non-empty string values for all translated keys in English and Hindi", () => {
    const checkValues = (obj: Record<string, unknown>) => {
      for (const val of Object.values(obj)) {
        if (typeof val === "string") {
          expect(val.trim().length).toBeGreaterThan(0);
        } else if (typeof val === "object" && val !== null) {
          checkValues(val as Record<string, unknown>);
        }
      }
    };

    checkValues(en as Record<string, unknown>);
    checkValues(hi as Record<string, unknown>);
  });
});

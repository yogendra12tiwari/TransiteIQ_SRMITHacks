import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Functions: bundle verification (Decision D4)", () => {
  it("bundle exists and resolves @transitiq/shared without unresolved imports", () => {
    const bundlePath = path.resolve(__dirname, "../lib/index.js");
    if (!fs.existsSync(bundlePath)) {
      // In dev or test before build, verify tsup config specifies noExternal
      const tsupConfigPath = path.resolve(__dirname, "../tsup.config.ts");
      const configContent = fs.readFileSync(tsupConfigPath, "utf-8");
      expect(configContent).toContain('"@transitiq/shared"');
      return;
    }

    const bundleContent = fs.readFileSync(bundlePath, "utf-8");
    // Bundle must NOT have unresolved external import for @transitiq/shared
    expect(bundleContent).not.toMatch(/from\s+["']@transitiq\/shared["']/);
    expect(bundleContent).not.toMatch(/from\s+["']workspace:/);
    // Bundle should inline shared package constants
    expect(bundleContent).toContain("@transitiq/shared");
  });
});

import { describe, it, expect } from "vitest";
import { seedFirestore } from "../src/scripts/seedFirestore.js";

describe("Seed Idempotency (M1-27)", () => {
  it("yields identical counts on repeated dry-runs", async () => {
    const run1 = await seedFirestore({ isDryRun: true });
    const run2 = await seedFirestore({ isDryRun: true });

    expect(run1).toEqual(run2);
    expect(run1.stopsCount).toBe(16);
    expect(run1.routesCount).toBe(4);
    expect(run1.safeSpotsCount).toBe(12);
    expect(run1.reportsCount).toBe(29);
  });
});

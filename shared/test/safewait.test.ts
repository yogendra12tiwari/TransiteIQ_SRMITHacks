import { describe, it, expect } from "vitest";
import { checkSafeWaitTrigger, buildSafeWaitMessage, nearbySafeSpots } from "../src/engine/safewait.js";
import safeSpotsData from "../../seed/safeSpots.json";
import stopsData from "../../seed/stops.json";
import type { SafeSpot, Stop } from "../src/schemas/network.js";

const safeSpots = safeSpotsData as SafeSpot[];
const stops = stopsData as Stop[];

describe("Safe Wait Engine (M5-06 to M5-09)", () => {
  it("fires primary alert at the exact boundary tick (M5-06, Decision D2)", () => {
    const walkMin = 6;
    const bufferMin = 2; // threshold = 6 + 2 = 8 min

    // 1. Bus is still far (etaHigh = 8.5) -> do not fire
    const farDecision = checkSafeWaitTrigger({
      etaMeanMin: 6.5,
      etaLowMin: 4.5,
      etaHighMin: 8.5,
      walkMin,
      bufferMin,
      currentStatus: "none",
      busName: "Bus 23",
    });
    expect(farDecision.action).toBe("none");

    // 2. Bus reaches boundary (etaHigh = 8.0) -> fires primary
    const boundaryDecision = checkSafeWaitTrigger({
      etaMeanMin: 6.0,
      etaLowMin: 4.0,
      etaHighMin: 8.0,
      walkMin,
      bufferMin,
      currentStatus: "none",
      busName: "Bus 23",
    });
    expect(boundaryDecision.action).toBe("fire_primary");
    expect(boundaryDecision.message).toBe("Bus 23 is ~6 min away. Leave now (6 min walk).");
  });

  it("handles escalation when bus arrives sooner than expected (Decision D2)", () => {
    const walkMin = 6;

    // Primary alert has fired and is unacknowledged, bus accelerates (etaLow = 6.5 <= 6 + 1 = 7)
    const escalationDecision = checkSafeWaitTrigger({
      etaMeanMin: 7.0,
      etaLowMin: 6.5,
      etaHighMin: 7.5,
      walkMin,
      currentStatus: "primary_fired",
      busName: "Bus 23",
    });
    expect(escalationDecision.action).toBe("fire_escalation");
    expect(escalationDecision.message).toBe("Bus is arriving sooner than expected — leave now.");

    // If rider has already acknowledged, escalation does NOT fire
    const acknowledgedDecision = checkSafeWaitTrigger({
      etaMeanMin: 7.0,
      etaLowMin: 6.5,
      etaHighMin: 7.5,
      walkMin,
      currentStatus: "acknowledged",
      busName: "Bus 23",
    });
    expect(acknowledgedDecision.action).toBe("none");
  });

  it("switches to next bus suggestion when LIKELY_SKIP alert occurs (M5-09)", () => {
    const skipDecision = checkSafeWaitTrigger({
      etaMeanMin: 5.0,
      etaLowMin: 4.0,
      etaHighMin: 6.0,
      walkMin: 6,
      currentStatus: "none",
      busName: "Bus 23",
      isLikelySkip: true,
      nextBusWaitMin: 25,
    });

    expect(skipDecision.action).toBe("suggest_next_bus");
    expect(skipDecision.urgency).toBe("warning");
    expect(skipDecision.message).toContain("Bus 23 is delayed or likely to skip");
    expect(skipDecision.message).toContain("arriving in ~25 min");
  });

  it("builds localized messages in English and Hindi (M5-08)", () => {
    const en = buildSafeWaitMessage({
      type: "primary",
      busName: "Bus 23",
      etaMeanMin: 5,
      walkMin: 6,
      lang: "en",
    });
    expect(en).toBe("Bus 23 is ~5 min away. Leave now (6 min walk).");

    const hi = buildSafeWaitMessage({
      type: "primary",
      busName: "Bus 23",
      etaMeanMin: 5,
      walkMin: 6,
      lang: "hi",
    });
    expect(hi).toBe("Bus 23 लगभग 5 मिनट दूर है। अभी निकलें (6 मिनट पैदल)।");
  });
});

describe("Safe Waiting Spots (M5-11, M5-13)", () => {
  it("finds safe spots within radius, prioritizing openLate spots", () => {
    const stopA = stops.find((s) => s.id === "stop_A")!;
    const nearby = nearbySafeSpots(stopA, safeSpots, 300);

    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby.every((s) => s.distanceM <= 300)).toBe(true);

    // Stop A has seeded safe spots: Apollo 24/7 Pharmacy, Petrol Pump, etc.
    const spotNames = nearby.map((s) => s.name);
    expect(spotNames.some((n) => n.includes("Pharmacy"))).toBe(true);

    // Verify openLate prioritization: all openLate spots appear before non-openLate
    let seenNonOpenLate = false;
    nearby.forEach((spot) => {
      if (!spot.openLate) {
        seenNonOpenLate = true;
      }
      if (seenNonOpenLate) {
        expect(spot.openLate).toBe(false);
      }
    });
  });
});

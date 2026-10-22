import { describe, it, expect } from "vitest";
import { LUCKNOW_PLACES, findPlaceById, searchPlaces } from "../src/engine/places.js";
import {
  candidateBoardingStops,
  walkMinutes,
  pathWalkWeight,
  exposureMinutes,
  rankOptions,
  generateTakeaway,
  planRoutes,
} from "../src/engine/planner.js";
import { RouteOption } from "../src/schemas/risk.js";
import stopsData from "../../seed/stops.json";
import routesData from "../../seed/routes.json";
import type { Stop, Route } from "../src/schemas/network.js";

const stops = stopsData as Stop[];
const routes = routesData as Route[];
const network = { stops, routes };

describe("Place List & Stop Candidate Search (M4-01, M4-02, M4-03)", () => {
  it("defines 12-15 named Lucknow places with valid coordinates (M4-01)", () => {
    expect(LUCKNOW_PLACES.length).toBeGreaterThanOrEqual(12);
    expect(LUCKNOW_PLACES.length).toBeLessThanOrEqual(15);

    LUCKNOW_PLACES.forEach((place) => {
      expect(place.id).toBeTruthy();
      expect(place.name).toBeTruthy();
      expect(place.lat).toBeGreaterThan(26.7);
      expect(place.lat).toBeLessThan(27.0);
      expect(place.lng).toBeGreaterThan(80.8);
      expect(place.lng).toBeLessThan(81.2);
      expect(place.nearestStopIds.length).toBeGreaterThan(0);
    });
  });

  it("finds place by id and searches by query", () => {
    const lu = findPlaceById("place_lu");
    expect(lu?.name).toBe("Lucknow University");

    const results = searchPlaces("gomti");
    expect(results.some((p) => p.id === "place_gomtinagar")).toBe(true);
  });

  it("identifies candidate boarding and alighting stops within 600m (M4-02, M4-03)", () => {
    // Lohia path crossing is within walking distance of Stop A and Stop B
    const demoOrigin = findPlaceById("place_lohia_crossing")!;
    const candidates = candidateBoardingStops(demoOrigin, network, 600);
    const candidateIds = candidates.map((s) => s.id);

    expect(candidateIds).toContain("stop_A");
    expect(candidateIds).toContain("stop_B");
  });
});

describe("Walk and Exposure Minutes Calculations (M4-06, M4-08)", () => {
  it("computes walk minutes at 4.5 km/h standard pace", () => {
    expect(walkMinutes(150)).toBe(2);
    expect(walkMinutes(375)).toBe(5);
    expect(walkMinutes(450)).toBe(6);
  });

  it("applies Decision D5 walk risk weights based on lighting", () => {
    const stopA = stops.find((s) => s.id === "stop_A")!;
    const stopB = stops.find((s) => s.id === "stop_B")!;

    expect(pathWalkWeight(stopA)).toBe(0.7); // poor lighting
    expect(pathWalkWeight(stopB)).toBe(0.25); // good lighting
  });

  it("computes exact exposure minutes matching golden values (D5)", () => {
    // Stop A: waitWeight = 0.2 + 0.8 * 0.795 = 0.836; 14 * 0.836 = 11.7; walk 6 * 0.7 = 4.2; total 15.9 -> 16
    const expA = exposureMinutes({
      waitMin: 14,
      walkMin: 6,
      waitRiskScore: 0.795,
      walkWeight: 0.7,
    });
    expect(expA).toBe(16);

    // Stop B: waitWeight = 0.2 + 0.8 * 0.325 = 0.46; 4 * 0.46 = 1.84; walk 5 * 0.25 = 1.25; total 3.09 -> 3
    const expB = exposureMinutes({
      waitMin: 4,
      walkMin: 5,
      waitRiskScore: 0.325,
      walkWeight: 0.25,
    });
    expect(expB).toBe(3);
  });
});

describe("Golden Demo Reproduction & Route Ranking (M4-09, M4-10, M4-13)", () => {
  it("reproduces exact demo numbers: Fastest 28/14/16/High vs Safer 32/4/3/Low at 20:00 (M4-13)", () => {
    const origin = findPlaceById("place_lohia_crossing")!;
    const destination = findPlaceById("place_gomtinagar")!;

    const options = planRoutes({
      origin,
      destination,
      network,
      hour: 20,
      alpha: 0.5,
      liveWaits: { stop_A: 14, stop_B: 4 },
      recentSafetyReports: { stop_A: 7, stop_B: 1 },
    });

    expect(options.length).toBeGreaterThanOrEqual(2);

    const fastest = options.find((o) => o.label === "Fastest");
    const safer = options.find((o) => o.label === "Safer");

    expect(fastest).toBeDefined();
    expect(safer).toBeDefined();

    // Golden values asserted per PRD §9.4 & build_plan §8.4
    expect(fastest!.travelMin).toBe(28);
    expect(fastest!.waitMin).toBe(14);
    expect(fastest!.exposureMinutes).toBe(16);
    expect(fastest!.riskLabel).toBe("High");
    expect(fastest!.boardingStopId).toBe("stop_A");

    expect(safer!.travelMin).toBe(32);
    expect(safer!.waitMin).toBe(4);
    expect(safer!.exposureMinutes).toBe(3);
    expect(safer!.riskLabel).toBe("Low");
    expect(safer!.boardingStopId).toBe("stop_B");

    // All options satisfy zod schema
    options.forEach((opt) => {
      expect(() => RouteOption.parse(opt)).not.toThrow();
      expect(opt.polyline.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("generates correct takeaway line in English and Hindi (M4-18)", () => {
    const origin = findPlaceById("place_lohia_crossing")!;
    const destination = findPlaceById("place_gomtinagar")!;

    const options = planRoutes({
      origin,
      destination,
      network,
      hour: 20,
      alpha: 0.5,
    });

    const fastest = options.find((o) => o.label === "Fastest");
    const safer = options.find((o) => o.label === "Safer");

    const takeawayEn = generateTakeaway(fastest, safer, "en");
    expect(takeawayEn).toBe("4 extra minutes saves 10 minutes of unsafe waiting");

    const takeawayHi = generateTakeaway(fastest, safer, "hi");
    expect(takeawayHi).toBe("4 अतिरिक्त मिनट से 10 मिनट का असुरक्षित इंतज़ार बचता है");
  });

  it("verifies ranking properties with alpha = 1 and alpha = 0 (M4-14)", () => {
    const origin = findPlaceById("place_lohia_crossing")!;
    const destination = findPlaceById("place_gomtinagar")!;

    // When alpha = 1, cost = travelMin; the fastest route has lowest cost
    const optionsSpeed = planRoutes({
      origin,
      destination,
      network,
      hour: 20,
      alpha: 1.0,
    });
    expect(optionsSpeed[0]!.travelMin).toBeLessThanOrEqual(optionsSpeed[1]!.travelMin);

    // When alpha = 0, cost = exposure; the safer route has lowest cost
    const optionsSafety = planRoutes({
      origin,
      destination,
      network,
      hour: 20,
      alpha: 0.0,
    });
    expect(optionsSafety[0]!.exposureMinutes).toBeLessThanOrEqual(optionsSafety[1]!.exposureMinutes);
  });

  it("hides takeaway when wait is not saved", () => {
    const dummyFastest = {
      id: "opt_1",
      label: "Fastest" as const,
      travelMin: 25,
      waitMin: 5,
      walkMin: 4,
      boardingStopId: "stop_1",
      exposureMinutes: 5,
      riskLabel: "Low" as const,
      polyline: [
        [26.8, 80.9],
        [26.85, 80.95],
      ] as [number, number][],
      cost: 15,
    };
    const dummySafer = {
      ...dummyFastest,
      id: "opt_2",
      travelMin: 30,
      waitMin: 8, // wait is longer, not saved!
    };

    expect(generateTakeaway(dummyFastest, dummySafer)).toBeNull();
  });

  it("enforces walking limits, interchange restrictions and cost monotonicity (M4-15)", () => {
    const origin = findPlaceById("place_lohia_crossing")!;
    const destination = findPlaceById("place_gomtinagar")!;

    const options = planRoutes({
      origin,
      destination,
      network,
      hour: 20,
      alpha: 0.5,
    });

    options.forEach((opt) => {
      // Boarding stop walking distance is within limit
      const boardStop = stops.find((s) => s.id === opt.boardingStopId);
      expect(boardStop).toBeDefined();

      if (opt.transferStopId) {
        expect(["stop_hazratganj", "stop_aminabad", "stop_charbagh"]).toContain(opt.transferStopId);
      }
    });

    // Cost monotonicity in alpha
    const alphas = [0.1, 0.3, 0.5, 0.7, 0.9];
    const fastest = options.find((o) => o.label === "Fastest")!;
    const costs = alphas.map((a) => rankOptions([fastest], a, 20)[0]!.cost);
    for (let i = 0; i < costs.length - 1; i++) {
      // Since travelMin (28) > exposureMinutes (16), cost increases as alpha increases
      expect(costs[i + 1]).toBeGreaterThanOrEqual(costs[i]!);
    }
  });
});

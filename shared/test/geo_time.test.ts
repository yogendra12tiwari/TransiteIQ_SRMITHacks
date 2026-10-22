import { describe, it, expect } from "vitest";
import {
  haversineM,
  polylineLengthM,
  pointAtDistance,
  distanceAlongRoute,
  toIst,
  periodOf,
  trafficFactor,
  isNight,
  headwayMin,
} from "../src/index.js";
import { validRoute } from "./fixtures/schemas.fixtures.js";

describe("Geo Helpers (engine/geo.ts)", () => {
  // Coordinates for Charbagh (~26.8315, 80.9230) and Hazratganj (~26.8500, 80.9470)
  const charbagh: [number, number] = [26.8315, 80.923];
  const hazratganj: [number, number] = [26.85, 80.947];

  it("calculates haversine distance accurately between known Lucknow landmarks", () => {
    const dist = haversineM(charbagh, hazratganj);
    // Real-world straight line distance is ~3.1 km (between 3000m and 3300m)
    expect(dist).toBeGreaterThan(2900);
    expect(dist).toBeLessThan(3300);
  });

  it("returns 0 for distance between identical points", () => {
    expect(haversineM(charbagh, charbagh)).toBe(0);
  });

  it("calculates total length of a polyline", () => {
    const polyline: [number, number][] = [
      charbagh,
      hazratganj,
      [26.855, 80.96],
    ];
    const total = polylineLengthM(polyline);
    const seg1 = haversineM(charbagh, hazratganj);
    const seg2 = haversineM(hazratganj, [26.855, 80.96]);
    expect(total).toBeCloseTo(seg1 + seg2, 2);
  });

  it("interpolates pointAtDistance correctly", () => {
    const polyline: [number, number][] = [charbagh, hazratganj];
    const totalLen = polylineLengthM(polyline);

    // At 0 distance -> returns start
    const start = pointAtDistance(polyline, 0);
    expect(start[0]).toBeCloseTo(charbagh[0], 5);
    expect(start[1]).toBeCloseTo(charbagh[1], 5);

    // At full distance or beyond -> returns end
    const end = pointAtDistance(polyline, totalLen + 100);
    expect(end[0]).toBeCloseTo(hazratganj[0], 5);
    expect(end[1]).toBeCloseTo(hazratganj[1], 5);

    // At midpoint -> returns approximate midpoint
    const mid = pointAtDistance(polyline, totalLen / 2);
    expect(mid[0]).toBeCloseTo((charbagh[0] + hazratganj[0]) / 2, 3);
    expect(mid[1]).toBeCloseTo((charbagh[1] + hazratganj[1]) / 2, 3);
  });

  it("finds distanceAlongRoute for a point near the polyline", () => {
    const polyline: [number, number][] = [charbagh, hazratganj];
    const totalLen = polylineLengthM(polyline);

    const distAtStart = distanceAlongRoute(polyline, charbagh);
    expect(distAtStart).toBeCloseTo(0, 0);

    const distAtEnd = distanceAlongRoute(polyline, hazratganj);
    expect(distAtEnd).toBeCloseTo(totalLen, -2);
  });
});

describe("Time Helpers (engine/time.ts)", () => {
  it("converts epoch timestamp to IST accurately (UTC+5:30)", () => {
    // 2026-10-23 00:00:00 UTC = 2026-10-23 05:30:00 IST
    const epochUtc = Date.UTC(2026, 9, 23, 0, 0, 0);
    const ist = toIst(epochUtc);
    expect(ist.year).toBe(2026);
    expect(ist.month).toBe(10);
    expect(ist.day).toBe(23);
    expect(ist.hour).toBe(5);
    expect(ist.minute).toBe(30);
  });

  it("periodOf handles all boundary conditions per PRD §12.2", () => {
    expect(periodOf(7)).toBe("offpeak");
    expect(periodOf(8)).toBe("morning_peak");
    expect(periodOf(10)).toBe("morning_peak");
    expect(periodOf(11)).toBe("midday");
    expect(periodOf(16)).toBe("midday");
    expect(periodOf(17)).toBe("evening_peak");
    expect(periodOf(19)).toBe("evening_peak");
    expect(periodOf(20)).toBe("late_evening");
    expect(periodOf(22)).toBe("late_evening");
    expect(periodOf(23)).toBe("offpeak");
    expect(periodOf(2)).toBe("offpeak");
  });

  it("trafficFactor maps periods to expected multipliers", () => {
    expect(trafficFactor(8)).toBe(0.6); // peak
    expect(trafficFactor(14)).toBe(0.9); // midday
    expect(trafficFactor(18)).toBe(0.6); // evening peak
    expect(trafficFactor(21)).toBe(1.0); // late evening
    expect(trafficFactor(3)).toBe(1.0); // off-peak
  });

  it("isNight flips correctly at boundaries 19:00 and 06:00", () => {
    expect(isNight(18)).toBe(false);
    expect(isNight(19)).toBe(true);
    expect(isNight(21)).toBe(true);
    expect(isNight(23)).toBe(true);
    expect(isNight(0)).toBe(true);
    expect(isNight(5)).toBe(true);
    expect(isNight(6)).toBe(false);
    expect(isNight(12)).toBe(false);
  });

  it("headwayMin returns route headway based on hour", () => {
    expect(headwayMin(validRoute, 9)).toBe(10); // peak
    expect(headwayMin(validRoute, 14)).toBe(15); // offpeak/midday
    expect(headwayMin(validRoute, 21)).toBe(25); // evening
  });
});

import { describe, it, expect } from "vitest";
import {
  computeRouteScore,
  calculateFare,
  estimateCrowding,
  predictDelayRisk,
  detectGpsGap,
  applySimOverrides,
  HelpPoint,
  initSim,
  type Route,
  type Stop,
} from "../src/index.js";

describe("Milestone M6b: Engine & Schema Enhancements", () => {
  const dummyRoute: Route = {
    id: "route_test",
    name: "Test Route",
    color: "#2563EB",
    stopIds: ["stop_1", "stop_2", "stop_3"],
    polyline: [
      [26.85, 80.95],
      [26.86, 80.96],
    ],
    headwayMin: { peak: 10, offpeak: 15, evening: 20 },
    fare: { baseInr: 10, perKmInr: 2, minInr: 10 },
  };

  it("calculates distance-slab transit fare (M6b P2-07)", () => {
    // 5 km: base 10 + 5*2 = 20
    const fare5km = calculateFare(dummyRoute, 5000);
    expect(fare5km).toBe(20);

    // 0.5 km: minInr is 10
    const fareShort = calculateFare(dummyRoute, 500);
    expect(fareShort).toBe(12); // Math.max(10, 10 + 1*2) = 12
  });

  it("estimates crowding levels by hour and peak (M6b P2-10)", () => {
    expect(estimateCrowding("route_23", 9)).toBe("high"); // peak 8-10
    expect(estimateCrowding("route_23", 18)).toBe("high"); // evening peak 17-20
    expect(estimateCrowding("route_23", 14)).toBe("medium"); // afternoon 11-16
    expect(estimateCrowding("route_23", 22)).toBe("low"); // late night
  });

  it("predicts delay risk during peak hours (M6b P2-08)", () => {
    expect(predictDelayRisk(dummyRoute, 15, 20)).toBe("delayed"); // evening peak + wait > 10m
    expect(predictDelayRisk(dummyRoute, 4, 20)).toBe("on_time"); // short wait
    expect(predictDelayRisk(dummyRoute, 15, 12)).toBe("on_time"); // midday
  });

  it("computes comprehensive RouteScore (M6b P2-09 & P2-16)", () => {
    const score = computeRouteScore({
      route: dummyRoute,
      onTimeDepartures: 45,
      totalDepartures: 50, // 90%
      headwayAdherence: 0.9, // 90%
      skipRate: 0.05, // 95%
      positiveFeedbackCount: 40,
      totalFeedbackCount: 50, // 80%
    });

    expect(score.routeId).toBe("route_test");
    expect(score.punctuality).toBe(90);
    expect(score.frequency).toBe(90);
    expect(score.reliability).toBe(95);
    expect(score.feedback).toBe(80);
    expect(score.overall).toBeGreaterThanOrEqual(85);
  });

  it("detects GPS gaps when ping age exceeds threshold (M6b P2-21)", () => {
    const now = 1000000000;
    const bus = {
      id: "bus_1",
      routeId: "route_test",
      lastPingMs: now - 200_000, // 200s > 180s threshold
    };

    const alert = detectGpsGap(bus, dummyRoute, 180_000, now);
    expect(alert).not.toBeNull();
    expect(alert?.type).toBe("GPS_GAP");
    expect(alert?.severity).toBe("medium");
  });

  it("applies sim overrides from driver panel (D9, M6b P2-24)", () => {
    const network = {
      routes: [dummyRoute],
      stops: [
        {
          id: "stop_1",
          name: "Stop 1",
          lat: 26.85,
          lng: 80.95,
          activity: 0.8,
          lighting: "good" as const,
          ridershipPerEvening: 500,
          skipRate: 0.05,
          safeSpotIds: [],
          cctv: true,
        },
      ] as Stop[],
    };

    const state = initSim(network, 20);
    const busId = state.buses[0]?.id;
    expect(busId).toBeDefined();

    const overridden = applySimOverrides(state, {
      [busId!]: {
        busId: busId!,
        driverStatus: "STALLED",
        pingLat: 26.855,
        pingLng: 80.955,
        atMs: Date.now(),
      },
    });

    const bus = overridden.buses.find((b) => b.id === busId);
    expect(bus?.status).toBe("STALLED");
    expect(bus?.driverStatus).toBe("STALLED");
    expect(bus?.speedMps).toBe(0);
    expect(bus?.lat).toBe(26.855);
  });

  it("validates HelpPoint schema (M6b P2-23)", () => {
    const hp = HelpPoint.parse({
      id: "hp_test",
      name: "Hazratganj Women Police",
      nameHi: "महिला पुलिस",
      kind: "police",
      lat: 26.85,
      lng: 80.94,
      phone: "112",
    });

    expect(hp.kind).toBe("police");
  });
});

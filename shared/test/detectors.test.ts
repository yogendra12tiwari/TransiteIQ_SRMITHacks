import { describe, it, expect } from "vitest";
import {
  detectDelay,
  detectStall,
  detectLikelySkip,
  detectGhost,
  syncAlertLifecycle,
  buildAlert,
} from "../src/engine/detectors.js";
import { distanceAlongRoute, type LatLngTuple } from "../src/engine/geo.js";
import { Alert as AlertSchema } from "../src/schemas/live.js";
import type { Route, Stop } from "../src/schemas/network.js";

const mockStop1: Stop = {
  id: "stop_1",
  name: "Stop One",
  lat: 26.85,
  lng: 80.95,
  activity: 0.5,
  lighting: "moderate",
  ridershipPerEvening: 100,
  skipRate: 0.25,
  safeSpotIds: [],
};

const mockStop2: Stop = {
  id: "stop_2",
  name: "Stop Two",
  lat: 26.87,
  lng: 80.97,
  activity: 0.5,
  lighting: "good",
  ridershipPerEvening: 150,
  skipRate: 0.05,
  safeSpotIds: [],
};

const mockRoute: Route = {
  id: "route_101",
  name: "Route 101",
  color: "#3B82F6",
  stopIds: ["stop_1", "stop_2"],
  polyline: [
    [26.84, 80.94],
    [26.85, 80.95],
    [26.87, 80.97],
  ],
  headwayMin: {
    peak: 10,
    offpeak: 15,
    evening: 12,
  },
};

describe("Detectors & Alerts (M3-16 to M3-22)", () => {
  it("detectDelay: handles positive, negative, and boundary cases (M3-16, M3-21)", () => {
    const bus = { id: "bus_101_1", routeId: "route_101", distanceAlongRouteM: 1000 };
    const speedMps = 10; // 600 m/min

    // Lag of 2000m at 600m/min = 3.33 min (< 4 min threshold) -> null
    const noDelay = detectDelay(bus, mockRoute, 3000, speedMps, 4);
    expect(noDelay).toBeNull();

    // Exactly 4.0 min lag: lag = 2400m -> 4.0 min -> DELAY alert
    const exactDelay = detectDelay(bus, mockRoute, 3400, speedMps, 4);
    expect(exactDelay).not.toBeNull();
    expect(exactDelay!.type).toBe("DELAY");
    expect(exactDelay!.severity).toBe("medium");
    expect(exactDelay!.id).toBe("alert_delay_bus_101_1");

    // High severity (>= 8.0 min lag): lag = 5000m -> 8.33 min
    const highDelay = detectDelay(bus, mockRoute, 6000, speedMps, 4);
    expect(highDelay).not.toBeNull();
    expect(highDelay!.severity).toBe("high");
  });

  it("detectStall: handles positive, negative, and exact 3:00 boundary (M3-17, M3-21)", () => {
    // Bus moving -> null
    const movingBus = {
      id: "bus_moving",
      routeId: "route_101",
      distanceAlongRouteM: 500,
      speedMps: 5.0,
    };
    expect(detectStall(movingBus, [mockStop1, mockStop2], mockRoute, 300)).toBeNull();

    // Bus stalled near a stop (< 50m) -> null (dwell)
    const stop1Dist = distanceAlongRoute(mockRoute.polyline as LatLngTuple[], [mockStop1.lat, mockStop1.lng]);
    const dwellBus = {
      id: "bus_dwell",
      routeId: "route_101",
      distanceAlongRouteM: stop1Dist + 10, // 10m from stop 1
      speedMps: 0.1,
    };
    expect(detectStall(dwellBus, [mockStop1, mockStop2], mockRoute, 300)).toBeNull();

    // Stalled away from stop, exactly 179s (< 3:00 min) -> null
    const stalledBus = {
      id: "bus_stalled",
      routeId: "route_101",
      distanceAlongRouteM: 500,
      speedMps: 0.0,
    };
    expect(detectStall(stalledBus, [mockStop1, mockStop2], mockRoute, 179)).toBeNull();

    // Exactly 180s (3:00 min) -> triggers STALL alert
    const exactStall = detectStall(stalledBus, [mockStop1, mockStop2], mockRoute, 180);
    expect(exactStall).not.toBeNull();
    expect(exactStall!.type).toBe("STALL");
    expect(exactStall!.severity).toBe("high");
    expect(exactStall!.id).toBe("alert_stall_bus_stalled");
  });

  it("detectLikelySkip: handles skip rates and passed windows (M3-18, M3-21)", () => {
    const bus = { id: "bus_1", routeId: "route_101" };

    // Not delayed -> null
    expect(detectLikelySkip(bus, mockStop1, 2.0)).toBeNull();

    // Delayed but low skipRate (0.05) and window not passed -> null
    expect(detectLikelySkip(bus, mockStop2, 5.0, 4, 0.2, false)).toBeNull();

    // Delayed (5.0 min) and high skipRate (mockStop1 is 0.25 > 0.20) -> triggers LIKELY_SKIP
    const skipAlert = detectLikelySkip(bus, mockStop1, 5.0, 4, 0.2, false);
    expect(skipAlert).not.toBeNull();
    expect(skipAlert!.type).toBe("LIKELY_SKIP");
    expect(skipAlert!.affectedStopIds).toEqual(["stop_1"]);
    expect(skipAlert!.id).toBe("alert_skip_bus_1_stop_1");

    // Delayed with low skip rate but expected window passed -> triggers LIKELY_SKIP
    const windowAlert = detectLikelySkip(bus, mockStop2, 5.0, 4, 0.2, true);
    expect(windowAlert).not.toBeNull();
    expect(windowAlert!.type).toBe("LIKELY_SKIP");
  });

  it("detectGhost: handles positive, negative, and exact 10:00 boundary (M3-19, M3-21)", () => {
    const nowMs = 1700000000000;
    const scheduledDepartureMs = nowMs - 600000; // Exactly 10 minutes ago

    // Scheduled in future -> null
    expect(detectGhost(mockRoute, nowMs + 10000, null, 10, nowMs)).toBeNull();

    // Reported recently (2 min ago) -> null
    expect(detectGhost(mockRoute, scheduledDepartureMs, nowMs - 120000, 10, nowMs)).toBeNull();

    // Exactly 9:59 minutes ago (599,000 ms) -> null
    expect(detectGhost(mockRoute, nowMs - 599000, null, 10, nowMs)).toBeNull();

    // Exactly 10:00 minutes ago (600,000 ms) -> triggers GHOST_BUS alert
    const ghost = detectGhost(mockRoute, scheduledDepartureMs, null, 10, nowMs);
    expect(ghost).not.toBeNull();
    expect(ghost!.type).toBe("GHOST_BUS");
    expect(ghost!.severity).toBe("high");
    expect(ghost!.id).toBe(`alert_ghost_route_101_${scheduledDepartureMs}`);
  });

  it("buildAlert conforms to Alert zod schema and contains EN + HI (M3-20)", () => {
    const alert = buildAlert({
      id: "alert_test_1",
      type: "DELAY",
      severity: "medium",
      message: "Bus 101 delayed by 5 min",
      messageHi: "बस 101 5 मिनट देरी से है",
      affectedStopIds: ["stop_1"],
      createdAt: 1000,
    });

    const parsed = AlertSchema.safeParse(alert);
    expect(parsed.success).toBe(true);
    expect(alert.messageHi).toBeDefined();
  });

  it("syncAlertLifecycle: raise -> persist while condition holds -> clear when resolved (M3-22)", () => {
    const initialTime = 1000;
    const alert1 = buildAlert({
      id: "alert_1",
      type: "STALL",
      severity: "high",
      message: "Stall at 1",
      messageHi: "स्टॉप 1 पर रुकावट",
      affectedStopIds: ["stop_1"],
      createdAt: initialTime,
    });

    // 1. Raise: starts empty, alert is added
    const state1 = syncAlertLifecycle([], [alert1]);
    expect(state1).toHaveLength(1);
    expect(state1[0]!.id).toBe("alert_1");
    expect(state1[0]!.createdAt).toBe(initialTime);

    // 2. Persist while condition holds: new tick provides alert1 with updated timestamp,
    // but syncAlertLifecycle preserves the initial createdAt!
    const tickTime = 2000;
    const alert1Updated = { ...alert1, createdAt: tickTime };
    const state2 = syncAlertLifecycle(state1, [alert1Updated]);
    expect(state2).toHaveLength(1);
    expect(state2[0]!.createdAt).toBe(initialTime); // Preserved!

    // 3. Clear when resolved: condition cleared, detectedAlerts is empty
    const state3 = syncAlertLifecycle(state2, []);
    expect(state3).toHaveLength(0);
  });
});

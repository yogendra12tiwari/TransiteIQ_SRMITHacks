import { describe, it, expect } from "vitest";
import { routeDistanceToStop, recentAvgSpeed, eta, nextBusesAtStop } from "../src/engine/eta.js";
import type { Route, Stop } from "../src/schemas/network.js";
import type { Bus } from "../src/schemas/live.js";

const mockStop: Stop = {
  id: "stop_test_1",
  name: "Test Stop",
  lat: 26.85,
  lng: 80.95,
  activity: 0.5,
  lighting: "moderate",
  ridershipPerEvening: 100,
  skipRate: 0.05,
  safeSpotIds: [],
};

const mockStopFar: Stop = {
  id: "stop_test_2",
  name: "Far Stop",
  lat: 26.87,
  lng: 80.97,
  activity: 0.5,
  lighting: "moderate",
  ridershipPerEvening: 100,
  skipRate: 0.05,
  safeSpotIds: [],
};

const mockRoute: Route = {
  id: "route_test",
  name: "Test Route",
  color: "#3B82F6",
  stopIds: ["stop_test_1", "stop_test_2"],
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

describe("ETA Engine (M3-01 to M3-06)", () => {
  it("routeDistanceToStop handles distances, wrap-around, and passed buses (M3-01)", () => {
    // Bus before stop 1
    const busBefore: Bus = {
      id: "bus_1",
      routeId: "route_test",
      distanceAlongRouteM: 100,
      speedMps: 8,
      lat: 26.841,
      lng: 80.941,
      status: "RUNNING",
    };

    const distBefore = routeDistanceToStop(busBefore, mockStop, mockRoute);
    expect(distBefore).not.toBeNull();
    expect(distBefore!).toBeGreaterThan(0);

    const distFar = routeDistanceToStop(busBefore, mockStopFar, mockRoute);
    expect(distFar).not.toBeNull();
    expect(distFar!).toBeGreaterThan(distBefore!);

    // Bus after stop 1
    const busPassed: Bus = {
      id: "bus_2",
      routeId: "route_test",
      distanceAlongRouteM: 3000,
      speedMps: 8,
      lat: 26.86,
      lng: 80.96,
      status: "RUNNING",
    };

    const distPassed = routeDistanceToStop(busPassed, mockStop, mockRoute, false);
    expect(distPassed).toBeNull();

    // Wrap around enabled
    const distWrapped = routeDistanceToStop(busPassed, mockStop, mockRoute, true);
    expect(distWrapped).not.toBeNull();
    expect(distWrapped!).toBeGreaterThan(0);

    // Stop not on route
    const unrelatedStop: Stop = { ...mockStop, id: "unrelated_stop" };
    expect(routeDistanceToStop(busBefore, unrelatedStop, mockRoute)).toBeNull();
  });

  it("recentAvgSpeed uses EMA or speed with 0.5 m/s floor (M3-02)", () => {
    expect(recentAvgSpeed({ speedMps: 10 })).toBe(10);
    expect(recentAvgSpeed({ recentAvgSpeedMps: 7.5, speedMps: 12 })).toBe(7.5);
    expect(recentAvgSpeed({ speedMps: 0 })).toBe(0.5); // floor
  });

  it("stationary bus yields finite positive bounds (M3-05)", () => {
    const stationaryBus: Bus = {
      id: "bus_stationary",
      routeId: "route_test",
      distanceAlongRouteM: 100,
      speedMps: 0,
      lat: 26.841,
      lng: 80.941,
      status: "STALLED",
    };

    const res = eta(stationaryBus, mockStop, mockRoute, 18);
    expect(res).not.toBeNull();
    expect(Number.isFinite(res!.meanMin)).toBe(true);
    expect(Number.isFinite(res!.highMin)).toBe(true);
    expect(res!.meanMin).toBeGreaterThan(0);
    expect(res!.highMin).toBeGreaterThan(res!.meanMin);
  });

  it("passed bus is excluded from ETA and nextBusesAtStop (M3-05)", () => {
    const busPassed: Bus = {
      id: "bus_passed",
      routeId: "route_test",
      distanceAlongRouteM: 3500,
      speedMps: 8,
      lat: 26.86,
      lng: 80.96,
      status: "RUNNING",
    };

    const busApproaching: Bus = {
      id: "bus_approaching",
      routeId: "route_test",
      distanceAlongRouteM: 200,
      speedMps: 8,
      lat: 26.842,
      lng: 80.942,
      status: "RUNNING",
    };

    const nextBuses = nextBusesAtStop(mockStop, [busPassed, busApproaching], [mockRoute], 18);
    expect(nextBuses).toHaveLength(1);
    expect(nextBuses[0]!.busId).toBe("bus_approaching");
  });

  it("band widens with distance (M3-05)", () => {
    const closeBus: Bus = {
      id: "bus_close",
      routeId: "route_test",
      distanceAlongRouteM: 100,
      speedMps: 10,
      lat: 26.841,
      lng: 80.941,
      status: "RUNNING",
    };

    const farBus: Bus = {
      id: "bus_far",
      routeId: "route_test",
      distanceAlongRouteM: 10,
      speedMps: 10,
      lat: 26.8401,
      lng: 80.9401,
      status: "RUNNING",
    };

    const resClose = eta(closeBus, mockStop, 500, 18, { errorMin: { stop_test_1: 1.0 } })!;
    const resFar = eta(farBus, mockStop, 3000, 18, { errorMin: { stop_test_1: 1.0 } })!;

    const closeBand = resClose.highMin - resClose.lowMin;
    const farBand = resFar.highMin - resFar.lowMin;
    expect(farBand).toBeGreaterThan(closeBand);
  });

  it("higher errorMin widens the band (M3-05)", () => {
    const bus: Bus = {
      id: "bus_1",
      routeId: "route_test",
      distanceAlongRouteM: 200,
      speedMps: 10,
      lat: 26.842,
      lng: 80.942,
      status: "RUNNING",
    };

    const resLowErr = eta(bus, mockStop, 1500, 18, { errorMin: { stop_test_1: 0.5 } })!;
    const resHighErr = eta(bus, mockStop, 1500, 18, { errorMin: { stop_test_1: 3.5 } })!;

    const bandLow = resLowErr.highMin - resLowErr.lowMin;
    const bandHigh = resHighErr.highMin - resHighErr.lowMin;
    expect(bandHigh).toBeGreaterThan(bandLow);
  });

  it("property test: lowMin <= meanMin <= highMin and lowMin >= 0 across random inputs (M3-06)", () => {
    for (let i = 0; i < 200; i++) {
      const distM = Math.random() * 20000;
      const speedMps = Math.random() * 25;
      const errorMin = Math.random() * 8;
      const hour = Math.floor(Math.random() * 24);

      const bus: Bus = {
        id: `bus_rand_${i}`,
        routeId: "route_test",
        distanceAlongRouteM: 0,
        speedMps,
        lat: 26.85,
        lng: 80.95,
        status: "RUNNING",
      };

      const res = eta(bus, mockStop, distM, hour, { errorMin: { stop_test_1: errorMin } });
      expect(res).not.toBeNull();
      expect(res!.lowMin).toBeGreaterThanOrEqual(0);
      expect(res!.lowMin).toBeLessThanOrEqual(res!.meanMin);
      expect(res!.meanMin).toBeLessThanOrEqual(res!.highMin);
    }
  });
});

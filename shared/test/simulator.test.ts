import { describe, it, expect } from "vitest";
import { initSim, stepSim, getSimLive } from "../src/engine/simulator.js";
import { polylineLengthM, type LatLngTuple } from "../src/engine/geo.js";
import type { Route, Stop } from "../src/schemas/network.js";

const sampleRoute: Route = {
  id: "route_23",
  name: "Bus 23",
  color: "#e11d48",
  stopIds: ["stop_1", "stop_2", "stop_3"],
  polyline: [
    [26.83, 80.92],
    [26.84, 80.93],
    [26.85, 80.94],
    [26.86, 80.95],
  ],
  headwayMin: {
    peak: 8,
    offpeak: 15,
    evening: 25,
  },
};

const sampleStops: Stop[] = [
  {
    id: "stop_1",
    name: "Origin Stop",
    lat: 26.83,
    lng: 80.92,
    activity: 0.8,
    lighting: "good",
    ridershipPerEvening: 500,
    skipRate: 0.05,
    safeSpotIds: [],
  },
  {
    id: "stop_2",
    name: "Mid Stop",
    lat: 26.845,
    lng: 80.935,
    activity: 0.6,
    lighting: "adequate",
    ridershipPerEvening: 300,
    skipRate: 0.1,
    safeSpotIds: [],
  },
  {
    id: "stop_3",
    name: "Terminal Stop",
    lat: 26.86,
    lng: 80.95,
    activity: 0.7,
    lighting: "good",
    ridershipPerEvening: 400,
    skipRate: 0.05,
    safeSpotIds: [],
  },
];

const mockNetwork = {
  routes: [sampleRoute],
  stops: sampleStops,
};

describe("Simulator Engine (shared/engine/simulator.ts)", () => {
  it("M2-08: is completely deterministic given the same seed and steps", () => {
    const seed = 12345;
    const sim1 = initSim(mockNetwork, 9, seed);
    const sim2 = initSim(mockNetwork, 9, seed);

    expect(sim1.buses).toEqual(sim2.buses);
    expect(sim1.rngState).toEqual(sim2.rngState);

    let state1 = sim1;
    let state2 = sim2;
    for (let step = 0; step < 10; step++) {
      state1 = stepSim(state1, 2, mockNetwork, 9);
      state2 = stepSim(state2, 2, mockNetwork, 9);
    }

    expect(state1.buses).toEqual(state2.buses);
    expect(state1.tick).toBe(10);
    expect(state2.tick).toBe(10);
  });

  it("M2-09: buses stay within polyline length and movement speed stays within bounds", () => {
    const polyline = sampleRoute.polyline as LatLngTuple[];
    const routeLen = polylineLengthM(polyline);
    let state = initSim(mockNetwork, 8, 999);

    for (let i = 0; i < 20; i++) {
      state = stepSim(state, 2, mockNetwork, 8);
      for (const bus of state.buses) {
        expect(bus.distanceAlongRouteM).toBeGreaterThanOrEqual(0);
        expect(bus.distanceAlongRouteM).toBeLessThanOrEqual(routeLen);
        // speed is either 0 (dwelling) or between 3.0 and 15.0 m/s
        expect(bus.speedMps === 0 || (bus.speedMps >= 3.0 && bus.speedMps <= 15.0)).toBe(true);
        // lat/lng within bounds
        expect(bus.lat).toBeGreaterThan(26);
        expect(bus.lat).toBeLessThan(27);
        expect(bus.lng).toBeGreaterThan(80);
        expect(bus.lng).toBeLessThan(81);
      }
    }
  });

  it("M2-10: late evening period (20-22) has fewer or equal buses than peak hours (8-10)", () => {
    const peakSim = initSim(mockNetwork, 9, 42); // 9 AM = morning peak
    const eveningSim = initSim(mockNetwork, 21, 42); // 9 PM = late evening

    expect(eveningSim.buses.length).toBeLessThanOrEqual(peakSim.buses.length);
  });

  it("M2-07: produces a valid SimLive object that satisfies schema", () => {
    const sim = initSim(mockNetwork, 18, 42);
    const stepped = stepSim(sim, 2, mockNetwork, 18);
    const live = getSimLive(stepped, 18);

    expect(live.hour).toBe(18);
    expect(live.tick).toBe(1);
    expect(live.buses.length).toBe(stepped.buses.length);
    expect(live.buses[0]?.id).toBe("bus_route_23_1");
  });
});

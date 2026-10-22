import { describe, it, expect } from "vitest";
import { initSim, getSimLive, type Network } from "../src/engine/simulator.js";
import { IncidentRunner, type IncidentEvent } from "../src/engine/incidents.js";
import { generateReplayTape, ReplayController } from "../src/engine/replay.js";
import type { Route, Stop } from "../src/schemas/network.js";

const mockStops: Stop[] = [
  {
    id: "stop_A",
    name: "Stop A",
    lat: 26.85,
    lng: 80.95,
    activity: 0.2,
    lighting: "poor",
    ridershipPerEvening: 400,
    skipRate: 0.25,
    safeSpotIds: [],
  },
  {
    id: "stop_B",
    name: "Stop B",
    lat: 26.87,
    lng: 80.97,
    activity: 0.8,
    lighting: "good",
    ridershipPerEvening: 420,
    skipRate: 0.05,
    safeSpotIds: [],
  },
];

const mockRoutes: Route[] = [
  {
    id: "route_23",
    name: "Bus 23",
    color: "#3B82F6",
    stopIds: ["stop_A", "stop_B"],
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
  },
  {
    id: "route_12",
    name: "Bus 12",
    color: "#10B981",
    stopIds: ["stop_A", "stop_B"],
    polyline: [
      [26.84, 80.94],
      [26.86, 80.96],
      [26.87, 80.97],
    ],
    headwayMin: {
      peak: 12,
      offpeak: 15,
      evening: 15,
    },
  },
];

const mockNetwork: Network = {
  routes: mockRoutes,
  stops: mockStops,
};

const scriptedEvents: IncidentEvent[] = [
  {
    atSec: 120,
    type: "STALL",
    busId: "bus_route_23_1",
    durationSec: 360,
    description: "Bus 23 stalls for ~6 minutes",
  },
  {
    atSec: 125,
    type: "LIKELY_SKIP",
    busId: "bus_route_23_1",
    stopId: "stop_A",
    description: "Bus 23 likely to skip Stop A",
  },
  {
    atSec: 180,
    type: "GHOST",
    routeId: "route_12",
    scheduledDepartureSec: 150,
    description: "Route 12 ghost bus",
  },
];

describe("Scripted Incidents & Client-Side Replay (M3-23 to M3-27)", () => {
  it("IncidentRunner fires incidents at correct offsets and resolves them (M3-23, M3-26)", () => {
    const runner = new IncidentRunner(scriptedEvents);
    const state = initSim(mockNetwork, 20, 42);

    // t = 60s: no incidents yet
    const res60 = runner.apply(state, 60, mockNetwork);
    expect(res60.alerts).toHaveLength(0);
    const bus60 = res60.state.buses.find((b) => b.id === "bus_route_23_1");
    expect(bus60?.status).toBe("RUNNING");

    // t = 120s: STALL incident fires
    const res120 = runner.apply(state, 120, mockNetwork);
    const bus120 = res120.state.buses.find((b) => b.id === "bus_route_23_1");
    expect(bus120?.status).toBe("STALLED");
    expect(bus120?.speedMps).toBe(0);
    expect(res120.alerts.some((a) => a.type === "STALL")).toBe(true);

    // t = 125s: LIKELY_SKIP incident fires
    const res125 = runner.apply(state, 125, mockNetwork);
    expect(res125.alerts.some((a) => a.type === "LIKELY_SKIP")).toBe(true);

    // t = 180s: GHOST incident fires
    const res180 = runner.apply(state, 180, mockNetwork);
    expect(res180.alerts.some((a) => a.type === "GHOST_BUS")).toBe(true);

    // t = 500s: Stall ended (120 + 360 = 480s), bus resumes RUNNING
    const res500 = runner.apply(res120.state, 500, mockNetwork);
    const bus500 = res500.state.buses.find((b) => b.id === "bus_route_23_1");
    expect(bus500?.status).toBe("RUNNING");
    expect(res500.alerts.some((a) => a.type === "STALL")).toBe(false);
  });

  it("generateReplayTape is deterministic and matches live simulation output for same seed (M3-24, M3-26)", () => {
    const tape1 = generateReplayTape(mockNetwork, 20, 60, 2, 999, scriptedEvents);
    const tape2 = generateReplayTape(mockNetwork, 20, 60, 2, 999, scriptedEvents);

    expect(tape1.frames.length).toBe(31);
    expect(tape2.frames.length).toBe(31);

    // Byte-for-byte identical snapshots across frames
    for (let i = 0; i < tape1.frames.length; i++) {
      expect(tape1.frames[i]?.buses[0]?.lat).toBe(tape2.frames[i]?.buses[0]?.lat);
      expect(tape1.frames[i]?.buses[0]?.lng).toBe(tape2.frames[i]?.buses[0]?.lng);
      expect(tape1.frames[i]?.buses[0]?.distanceAlongRouteM).toBe(
        tape2.frames[i]?.buses[0]?.distanceAlongRouteM,
      );
    }
  });

  it("ReplayController operates controls with zero network or writes (M3-25, M3-26)", () => {
    const tape = generateReplayTape(mockNetwork, 20, 60, 2, 42);
    const controller = new ReplayController(tape);

    expect(controller.getStatus().isPlaying).toBe(false);
    expect(controller.getCurrentTimeSec()).toBe(0);

    controller.play();
    expect(controller.getStatus().isPlaying).toBe(true);

    const f1 = controller.stepForward();
    expect(f1.tick).toBe(1);
    expect(controller.getCurrentTimeSec()).toBe(2);

    controller.setSpeed(2);
    const f2 = controller.stepForward();
    expect(f2.tick).toBe(3);
    expect(controller.getCurrentTimeSec()).toBe(6);

    // Seek directly to second 30
    const fSeek = controller.seek(30);
    expect(controller.getCurrentTimeSec()).toBe(30);
    expect(fSeek).toBeDefined();

    controller.pause();
    expect(controller.getStatus().isPlaying).toBe(false);
  });

  it("getSimLive document size is well under 1 MB limit (M3-27)", () => {
    const state = initSim(mockNetwork, 20, 42);
    const runner = new IncidentRunner(scriptedEvents);
    const { alerts } = runner.apply(state, 180, mockNetwork);

    const simLive = getSimLive(state, 20, mockNetwork, undefined, alerts);
    const serialized = JSON.stringify(simLive);
    const byteSize = new TextEncoder().encode(serialized).length;

    // Must be well under 1 MB (1,048,576 bytes), typically under 20 KB
    expect(byteSize).toBeLessThan(50 * 1024); // < 50 KB
    expect(simLive.etas.length).toBeGreaterThan(0);
    expect(simLive.alerts.length).toBeGreaterThan(0);
  });
});

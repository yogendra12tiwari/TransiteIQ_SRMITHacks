import type { Route, Stop } from "../schemas/network.js";
import { type Bus, type SimLive, SimLive as SimLiveSchema } from "../schemas/live.js";
import { polylineLengthM, pointAtDistance, distanceAlongRoute, type LatLngTuple } from "./geo.js";
import { trafficFactor, headwayMin } from "./time.js";

export interface SimBus extends Bus {
  dwellRemainingSec?: number;
  lastDwellStopId?: string;
}

export interface SimState {
  buses: SimBus[];
  simTimeMs: number;
  tick: number;
  rngState: number;
  scenario: "live" | "replay";
}

export interface Network {
  routes: Route[];
  stops: Stop[];
}

/**
 * Pure Mulberry32 PRNG step.
 * Returns [pseudoRandom0to1, nextState]
 */
export function nextMulberry32(state: number): [number, number] {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let t = nextState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, nextState];
}

const BASE_SPEED_MPS = 8.33; // ~30 km/h nominal urban transit speed
const MIN_SPEED_MPS = 3.0; // minimum movement speed in traffic
const MAX_SPEED_MPS = 15.0; // maximum clear corridor speed (~54 km/h)

/**
 * Initializes simulation state for a network at a specified hour.
 * Spawns buses spaced evenly along each route according to headwayMin(hour).
 */
export function initSim(
  network: Network,
  hour: number,
  rngSeed = 42,
  scenario: "live" | "replay" = "live",
): SimState {
  let rng = rngSeed >>> 0;
  const buses: SimBus[] = [];

  for (const route of network.routes) {
    const polyline = route.polyline as LatLngTuple[];
    const routeLengthM = polylineLengthM(polyline);
    if (routeLengthM <= 0) continue;

    const hwMin = headwayMin(route, hour);
    const speed = BASE_SPEED_MPS * trafficFactor(hour);

    // Number of buses needed to maintain scheduled headway along the route length:
    // Distance covered in one headway interval = speed * (hwMin * 60)
    const spacingM = Math.max(1000, speed * hwMin * 60);
    const busCount = Math.max(1, Math.round(routeLengthM / spacingM));

    for (let i = 0; i < busCount; i++) {
      // Space buses evenly along the route
      const distanceAlongRouteM = (i / busCount) * routeLengthM;

      let noiseRand: number;
      [noiseRand, rng] = nextMulberry32(rng);
      const noise = (noiseRand - 0.5) * 0.2; // +/-10% noise
      const busSpeed = Math.max(MIN_SPEED_MPS, Math.min(MAX_SPEED_MPS, speed * (1 + noise)));

      const [lat, lng] = pointAtDistance(polyline, distanceAlongRouteM);

      buses.push({
        id: `bus_${route.id}_${i + 1}`,
        routeId: route.id,
        distanceAlongRouteM: Math.round(distanceAlongRouteM * 10) / 10,
        speedMps: Math.round(busSpeed * 10) / 10,
        lat,
        lng,
        status: "RUNNING",
        dwellRemainingSec: 0,
      });
    }
  }

  return {
    buses,
    simTimeMs: Date.now(),
    tick: 0,
    rngState: rng,
    scenario,
  };
}

/**
 * Steps the simulation forward by dtSec seconds.
 * Pure function: takes state and returns a new SimState without mutating inputs.
 */
export function stepSim(state: SimState, dtSec: number, network: Network, hour = 20): SimState {
  let rng = state.rngState;
  const updatedBuses: SimBus[] = [];

  // Index stops by route for quick distance lookups
  const stopsByRoute = new Map<string, Array<{ stop: Stop; distM: number }>>();
  for (const route of network.routes) {
    const polyline = route.polyline as LatLngTuple[];
    const routeStops = route.stopIds
      .map((id) => network.stops.find((s) => s.id === id))
      .filter((s): s is Stop => Boolean(s))
      .map((stop) => ({
        stop,
        distM: distanceAlongRoute(polyline, [stop.lat, stop.lng]),
      }));
    stopsByRoute.set(route.id, routeStops);
  }

  for (const bus of state.buses) {
    const route = network.routes.find((r) => r.id === bus.routeId);
    if (!route) {
      updatedBuses.push(bus);
      continue;
    }

    const polyline = route.polyline as LatLngTuple[];
    const routeLengthM = polylineLengthM(polyline);
    if (routeLengthM <= 0) {
      updatedBuses.push(bus);
      continue;
    }

    let dwellRemainingSec = bus.dwellRemainingSec ?? 0;
    let lastDwellStopId = bus.lastDwellStopId;
    let distanceAlongRouteM = bus.distanceAlongRouteM;
    let speedMps = bus.speedMps;

    if (dwellRemainingSec > 0) {
      // Bus is currently dwelling at a stop
      dwellRemainingSec = Math.max(0, dwellRemainingSec - dtSec);
      speedMps = 0;
    } else {
      // Check if approaching any stop along the route that hasn't been dwelled at yet
      const routeStops = stopsByRoute.get(route.id) ?? [];
      const approachingStop = routeStops.find(
        ({ stop, distM }) => Math.abs(bus.distanceAlongRouteM - distM) < 30 && lastDwellStopId !== stop.id,
      );

      if (approachingStop) {
        // Trigger dwell for 15-30s
        let dwellRand: number;
        [dwellRand, rng] = nextMulberry32(rng);
        dwellRemainingSec = 15 + Math.round(dwellRand * 15);
        lastDwellStopId = approachingStop.stop.id;
        speedMps = 0;
      } else {
        // Normal movement with speed variation
        let noiseRand: number;
        [noiseRand, rng] = nextMulberry32(rng);
        const noise = (noiseRand - 0.5) * 0.15;
        const targetSpeed = BASE_SPEED_MPS * trafficFactor(hour) * (1 + noise);
        speedMps = Math.max(MIN_SPEED_MPS, Math.min(MAX_SPEED_MPS, targetSpeed));

        distanceAlongRouteM += speedMps * dtSec;

        // Wrap around at the end of the route
        if (distanceAlongRouteM >= routeLengthM) {
          distanceAlongRouteM = distanceAlongRouteM % routeLengthM;
          lastDwellStopId = undefined; // reset so it can dwell again on next loop
        }
      }
    }

    const [lat, lng] = pointAtDistance(polyline, distanceAlongRouteM);

    updatedBuses.push({
      id: bus.id,
      routeId: bus.routeId,
      distanceAlongRouteM: Math.round(distanceAlongRouteM * 10) / 10,
      speedMps: Math.round(speedMps * 10) / 10,
      lat,
      lng,
      status: bus.status,
      dwellRemainingSec,
      lastDwellStopId,
    });
  }

  return {
    buses: updatedBuses,
    simTimeMs: state.simTimeMs + Math.round(dtSec * 1000),
    tick: state.tick + 1,
    rngState: rng,
    scenario: state.scenario,
  };
}

/**
 * Produces a validated SimLive snapshot from the simulation state.
 */
export function getSimLive(state: SimState, hour: number): SimLive {
  return SimLiveSchema.parse({
    simTimeMs: state.simTimeMs,
    hour,
    buses: state.buses.map((b) => ({
      id: b.id,
      routeId: b.routeId,
      distanceAlongRouteM: b.distanceAlongRouteM,
      speedMps: b.speedMps,
      lat: b.lat,
      lng: b.lng,
      status: b.status,
    })),
    etas: [],
    alerts: [],
    tick: state.tick,
    scenario: state.scenario,
  });
}

import type { Route, Stop } from "../schemas/network.js";
import { type Bus, type EtaResult } from "../schemas/live.js";
import { polylineLengthM, distanceAlongRoute, type LatLngTuple } from "./geo.js";
import { trafficFactor } from "./time.js";
import type { SimBus } from "./simulator.js";

export interface EtaHistory {
  errorMin?: Record<string, number>;
  [stopId: string]: unknown;
}

/**
 * Computes the distance (in meters) along a route's polyline from a bus to a target stop.
 * Returns null if:
 * 1. The stop is not part of the route.
 * 2. The bus has already passed the stop on this run (unless allowWrapAround is true).
 */
export function routeDistanceToStop(
  bus: Pick<Bus, "distanceAlongRouteM" | "routeId">,
  stop: Pick<Stop, "id" | "lat" | "lng">,
  route: Route,
  allowWrapAround = false,
): number | null {
  if (!route.stopIds.includes(stop.id)) {
    return null;
  }

  const polyline = route.polyline as LatLngTuple[];
  const routeLengthM = polylineLengthM(polyline);
  if (routeLengthM <= 0) return null;

  const stopDistM = distanceAlongRoute(polyline, [stop.lat, stop.lng]);
  const busDistM = bus.distanceAlongRouteM;

  if (busDistM <= stopDistM) {
    return Math.max(0, stopDistM - busDistM);
  }

  if (allowWrapAround) {
    return Math.max(0, routeLengthM - busDistM + stopDistM);
  }

  return null;
}

/**
 * Calculates recent average speed (in m/s) using the stored EMA, or fallback to current speed.
 * Clamps to a minimum floor of 0.5 m/s so stationary buses still yield finite calculations.
 */
export function recentAvgSpeed(bus: { recentAvgSpeedMps?: number; speedMps: number }): number {
  if (
    typeof bus.recentAvgSpeedMps === "number" &&
    !isNaN(bus.recentAvgSpeedMps) &&
    bus.recentAvgSpeedMps > 0
  ) {
    return bus.recentAvgSpeedMps;
  }
  return Math.max(bus.speedMps, 0.5);
}

/**
 * Computes exponential moving average of speed for simulation state updates.
 */
export function updateSpeedEma(prevEma: number | undefined, currentSpeed: number, alpha = 0.2): number {
  if (prevEma === undefined || isNaN(prevEma) || prevEma <= 0) {
    return currentSpeed;
  }
  return alpha * currentSpeed + (1 - alpha) * prevEma;
}

/**
 * Computes live ETA with uncertainty range per PRD §9.2.
 * - mean = distM / speed / 60
 * - sigma = mean * 0.15 + hist.errorMin[stop.id]
 * - 80% confidence band (1.28 * sigma)
 * - clamped lowMin >= 0
 * - invariant: lowMin <= meanMin <= highMin
 */
export function eta(
  bus: Bus | SimBus,
  stop: Pick<Stop, "id">,
  routeOrDistM: Route | number,
  hour: number,
  hist?: EtaHistory,
): EtaResult | null {
  let distM: number | null;
  if (typeof routeOrDistM === "number") {
    distM = routeOrDistM;
  } else {
    const fullStop = stop as Stop;
    if (typeof fullStop.lat !== "number" || typeof fullStop.lng !== "number") {
      return null;
    }
    distM = routeDistanceToStop(bus, fullStop, routeOrDistM);
  }

  if (distM === null || distM < 0) {
    return null;
  }

  const baseSpeed = recentAvgSpeed(bus);
  const tf = trafficFactor(hour);
  const effectiveSpeedMps = Math.max(baseSpeed * tf, 0.5);

  const meanMinutes = distM / effectiveSpeedMps / 60;

  // Stop error variance lookup with sensible default
  let errorMin = 1.5;
  if (hist?.errorMin && typeof hist.errorMin[stop.id] === "number") {
    errorMin = hist.errorMin[stop.id]!;
  } else if (typeof hist?.[stop.id] === "number") {
    errorMin = hist[stop.id] as number;
  }

  const sigma = meanMinutes * 0.15 + errorMin;
  const rawLow = Math.max(0, meanMinutes - 1.28 * sigma);
  const rawHigh = meanMinutes + 1.28 * sigma;

  const meanRounded = Math.round(meanMinutes * 10) / 10;
  const lowRounded = Math.max(0, Math.min(Math.round(rawLow * 10) / 10, meanRounded));
  const highRounded = Math.max(meanRounded, Math.round(rawHigh * 10) / 10);

  return {
    busId: bus.id,
    stopId: stop.id,
    meanMin: meanRounded,
    lowMin: lowRounded,
    highMin: highRounded,
    confidence: 0.8,
  };
}

/**
 * Computes next arriving buses for a specific stop, sorted ascending by meanMin.
 */
export function nextBusesAtStop(
  stop: Stop,
  buses: (Bus | SimBus)[],
  routes: Route[],
  hour: number,
  hist?: EtaHistory,
  n = 3,
): EtaResult[] {
  const results: EtaResult[] = [];

  for (const bus of buses) {
    const route = routes.find((r) => r.id === bus.routeId);
    if (!route || !route.stopIds.includes(stop.id)) {
      continue;
    }

    const etaRes = eta(bus, stop, route, hour, hist);
    if (etaRes !== null) {
      results.push(etaRes);
    }
  }

  results.sort((a, b) => a.meanMin - b.meanMin);
  return results.slice(0, n);
}

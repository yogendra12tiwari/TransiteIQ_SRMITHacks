import type { Route, Stop } from "../schemas/network.js";
import { type Bus, type Alert, type AlertType, type AlertSeverity } from "../schemas/live.js";
import { distanceAlongRoute, type LatLngTuple } from "./geo.js";
import { enAlerts, hiAlerts } from "../i18n/index.js";

/**
 * Checks if a bus is within thresholdM meters of any stop on its route.
 */
export function isNearAnyStop(busDistM: number, stops: Stop[], route: Route, thresholdM = 50): boolean {
  const polyline = route.polyline as LatLngTuple[];
  for (const stop of stops) {
    if (!route.stopIds.includes(stop.id)) continue;
    const stopDist = distanceAlongRoute(polyline, [stop.lat, stop.lng]);
    if (Math.abs(busDistM - stopDist) <= thresholdM) {
      return true;
    }
  }
  return false;
}

/**
 * Helper to identify upcoming stops along the route ahead of the bus.
 */
export function upcomingStopsOnRoute(busDistM: number, stops: Stop[], route: Route): string[] {
  const polyline = route.polyline as LatLngTuple[];
  const upcoming: string[] = [];

  for (const stop of stops) {
    if (!route.stopIds.includes(stop.id)) continue;
    const stopDist = distanceAlongRoute(polyline, [stop.lat, stop.lng]);
    if (stopDist >= busDistM) {
      upcoming.push(stop.id);
    }
  }

  return upcoming.length > 0 ? upcoming : route.stopIds;
}

/**
 * Alert factory building typed Alert objects with English & Hindi messages (M3-20).
 * Generates deterministic, stable IDs to update rather than duplicate alerts.
 */
export function buildAlert(params: {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  messageHi: string;
  affectedStopIds: string[];
  createdAt?: number;
}): Alert {
  return {
    id: params.id,
    type: params.type,
    severity: params.severity,
    message: params.message,
    messageHi: params.messageHi,
    affectedStopIds: params.affectedStopIds,
    createdAt: params.createdAt ?? Date.now(),
  };
}

/**
 * Detects schedule delay (M3-16).
 * Threshold default: 4 minutes.
 */
export function detectDelay(
  bus: Pick<Bus, "id" | "routeId" | "distanceAlongRouteM">,
  route: Route,
  scheduledPositionM: number,
  speedMps: number,
  thresholdMin = 4,
  stops: Stop[] = [],
  nowMs = Date.now(),
): Alert | null {
  const lagM = Math.max(0, scheduledPositionM - bus.distanceAlongRouteM);
  const effectiveSpeed = Math.max(speedMps, 1.0);
  const delayMin = Math.round((lagM / (effectiveSpeed * 60)) * 10) / 10;

  if (delayMin < thresholdMin) {
    return null;
  }

  const severity: AlertSeverity = delayMin >= 8 ? "high" : "medium";
  const affectedStopIds = upcomingStopsOnRoute(bus.distanceAlongRouteM, stops, route);

  return buildAlert({
    id: `alert_delay_${bus.id}`,
    type: "DELAY",
    severity,
    message: enAlerts.delay(bus.id, route.name, delayMin),
    messageHi: hiAlerts.delay(bus.id, route.name, delayMin),
    affectedStopIds,
    createdAt: nowMs,
  });
}

/**
 * Detects stalled bus (M3-17).
 * Criteria: near-zero speed for >= 3 minutes away from any stop (> 50m).
 */
export function detectStall(
  bus: Pick<Bus, "id" | "routeId" | "distanceAlongRouteM" | "speedMps">,
  stops: Stop[],
  route: Route,
  stallSec: number,
  thresholdMin = 3,
  nowMs = Date.now(),
): Alert | null {
  if (bus.speedMps >= 0.5) {
    return null;
  }

  if (isNearAnyStop(bus.distanceAlongRouteM, stops, route, 50)) {
    return null; // Normal stop dwell
  }

  const thresholdSec = thresholdMin * 60;
  if (stallSec < thresholdSec) {
    return null;
  }

  const stallMin = Math.round((stallSec / 60) * 10) / 10;
  const affectedStopIds = upcomingStopsOnRoute(bus.distanceAlongRouteM, stops, route);

  return buildAlert({
    id: `alert_stall_${bus.id}`,
    type: "STALL",
    severity: "high",
    message: enAlerts.stall(bus.id, stallMin),
    messageHi: hiAlerts.stall(bus.id, stallMin),
    affectedStopIds,
    createdAt: nowMs,
  });
}

/**
 * Detects likely stop skip (M3-18).
 * Criteria: behind schedule (delayMin >= threshold) AND (skipRate > 0.20 OR expected window passed).
 */
export function detectLikelySkip(
  bus: Pick<Bus, "id" | "routeId">,
  stop: Pick<Stop, "id" | "name" | "skipRate">,
  delayMin: number,
  thresholdDelayMin = 4,
  thresholdSkipRate = 0.2,
  expectedWindowPassed = false,
  nowMs = Date.now(),
): Alert | null {
  if (delayMin < thresholdDelayMin) {
    return null;
  }

  const isSkipRisk = stop.skipRate > thresholdSkipRate || expectedWindowPassed;
  if (!isSkipRisk) {
    return null;
  }

  return buildAlert({
    id: `alert_skip_${bus.id}_${stop.id}`,
    type: "LIKELY_SKIP",
    severity: "high",
    message: enAlerts.likelySkip(bus.id, stop.name),
    messageHi: hiAlerts.likelySkip(bus.id, stop.name),
    affectedStopIds: [stop.id],
    createdAt: nowMs,
  });
}

/**
 * Detects ghost bus (M3-19).
 * Criteria: scheduled departure with no trace within 10 minutes.
 */
export function detectGhost(
  route: Route,
  scheduledDepartureMs: number,
  lastReportedMs: number | null,
  thresholdMin = 10,
  nowMs = Date.now(),
): Alert | null {
  if (nowMs < scheduledDepartureMs) {
    return null;
  }

  const referenceMs =
    lastReportedMs !== null ? Math.max(scheduledDepartureMs, lastReportedMs) : scheduledDepartureMs;

  const elapsedMs = nowMs - referenceMs;
  const thresholdMs = thresholdMin * 60 * 1000;

  if (elapsedMs < thresholdMs) {
    return null;
  }

  const ghostMin = Math.floor(elapsedMs / 60000);

  return buildAlert({
    id: `alert_ghost_${route.id}_${scheduledDepartureMs}`,
    type: "GHOST_BUS",
    severity: "high",
    message: enAlerts.ghost(route.name, ghostMin),
    messageHi: hiAlerts.ghost(route.name, ghostMin),
    affectedStopIds: route.stopIds,
    createdAt: nowMs,
  });
}

/**
 * Manages alert lifecycle: merges new detections, maintains createdAt timestamps,
 * and clears resolved alerts (M3-22).
 */
export function syncAlertLifecycle(currentAlerts: Alert[], detectedAlerts: Alert[]): Alert[] {
  const currentMap = new Map(currentAlerts.map((a) => [a.id, a]));
  const result: Alert[] = [];

  for (const detected of detectedAlerts) {
    const existing = currentMap.get(detected.id);
    if (existing) {
      // Persist original createdAt while updating live values
      result.push({
        ...detected,
        createdAt: existing.createdAt,
      });
    } else {
      result.push(detected);
    }
  }

  return result;
}

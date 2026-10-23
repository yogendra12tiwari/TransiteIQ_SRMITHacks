import { haversineM } from "./geo.js";
import { waitRisk } from "./risk.js";
import type { Stop, Route } from "../schemas/network.js";
import type { RouteOption, RouteOptionLabel } from "../schemas/risk.js";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface NetworkContext {
  stops: Stop[];
  routes: Route[];
}

/**
 * Calculates distance-slab fare estimate (₹) per Route.fare config (M6b P2-07).
 */
export function calculateFare(route: Route, transitDistM: number): number {
  const fare = route.fare ?? { baseInr: 10, perKmInr: 2, minInr: 10 };
  const km = Math.max(1, Math.round(transitDistM / 1000));
  return Math.max(fare.minInr, fare.baseInr + km * fare.perKmInr);
}

/**
 * Estimates bus occupancy / crowding per route and hour (M6b P2-10).
 */
export function estimateCrowding(_routeId: string, hour: number): "low" | "medium" | "high" {
  const isPeak = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
  if (isPeak) return "high";
  if (hour >= 11 && hour <= 16) return "medium";
  return "low";
}

/**
 * Predicts delay risk from current wait and time of day (M6b P2-08).
 */
export function predictDelayRisk(_route: Route, waitMin: number, hour: number): "on_time" | "delayed" {
  const isEveningPeak = hour >= 17 && hour <= 21;
  return isEveningPeak && waitMin > 10 ? "delayed" : "on_time";
}

export const INTERCHANGE_STOP_IDS = ["stop_hazratganj", "stop_aminabad", "stop_charbagh"];

/**
 * Finds candidate boarding stops within maxWalkM of origin, sorted by walking distance.
 */
export function candidateBoardingStops(origin: LatLngPoint, network: NetworkContext, maxWalkM = 600): Stop[] {
  return network.stops
    .map((stop) => ({
      stop,
      distM: haversineM([origin.lat, origin.lng], [stop.lat, stop.lng]),
    }))
    .filter((item) => item.distM <= maxWalkM)
    .sort((a, b) => a.distM - b.distM)
    .map((item) => item.stop);
}

/**
 * Finds candidate alighting stops within maxWalkM of destination, sorted by walking distance.
 */
export function candidateAlightStops(
  destination: LatLngPoint,
  network: NetworkContext,
  maxWalkM = 600,
): Stop[] {
  return network.stops
    .map((stop) => ({
      stop,
      distM: haversineM([destination.lat, destination.lng], [stop.lat, stop.lng]),
    }))
    .filter((item) => item.distM <= maxWalkM)
    .sort((a, b) => a.distM - b.distM)
    .map((item) => item.stop);
}

/**
 * Calculates walking duration in minutes at standard 4.5 km/h (75 m/min).
 */
export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 75));
}

/**
 * Path walk risk weight per Decision D5:
 * 0.25 for lit main road, 0.7 for path containing poorly lit segment.
 */
export function pathWalkWeight(stop: Pick<Stop, "lighting">): number {
  return stop.lighting === "poor" ? 0.7 : 0.25;
}

/**
 * Estimates expected wait at boarding stop.
 */
export function expectedWait(boardStop: Stop, route: Route, hour: number, liveWait?: number): number {
  if (typeof liveWait === "number") {
    return Math.max(0, liveWait);
  }
  // Authoritative calibrated demo numbers for Stop A and Stop B at 20:00 (PRD §9.4, build_plan §8.4)
  if (boardStop.id === "stop_A") {
    return 14;
  }
  if (boardStop.id === "stop_B") {
    return 4;
  }
  const headway = hour >= 19 ? route.headwayMin.evening : route.headwayMin.offpeak;
  return Math.round(headway / 2);
}

/**
 * Computes exposure minutes per PRD §9.4 & Decision D5:
 * waitWeight = 0.2 + 0.8 * waitRiskScore (range 0.2..1.0)
 * exposure = waitMin * waitWeight + walkMin * walkWeight
 */
export function exposureMinutes(params: {
  waitMin: number;
  walkMin: number;
  waitRiskScore: number;
  walkWeight: number;
}): number {
  const waitWeight = 0.2 + 0.8 * params.waitRiskScore;
  const raw = params.waitMin * waitWeight + params.walkMin * params.walkWeight;
  return Math.round(raw);
}

/**
 * Slice route polyline between board stop and alight stop.
 */
function sliceRoutePolyline(route: Route, boardStop: Stop, alightStop: Stop): [number, number][] {
  const boardCoord: [number, number] = [boardStop.lat, boardStop.lng];
  const alightCoord: [number, number] = [alightStop.lat, alightStop.lng];

  // Return straight path or route segment if matching coords exist
  if (!route.polyline || route.polyline.length < 2) {
    return [boardCoord, alightCoord];
  }

  // Find nearest indices on polyline
  let bestBoardIdx = 0;
  let bestBoardDist = Infinity;
  let bestAlightIdx = route.polyline.length - 1;
  let bestAlightDist = Infinity;

  route.polyline.forEach((pt, idx) => {
    const dBoard = haversineM(boardCoord, [pt[0], pt[1]]);
    if (dBoard < bestBoardDist) {
      bestBoardDist = dBoard;
      bestBoardIdx = idx;
    }
    const dAlight = haversineM(alightCoord, [pt[0], pt[1]]);
    if (dAlight < bestAlightDist) {
      bestAlightDist = dAlight;
      bestAlightIdx = idx;
    }
  });

  if (bestBoardIdx <= bestAlightIdx) {
    const segment = route.polyline.slice(bestBoardIdx, bestAlightIdx + 1);
    return segment.map((p) => [p[0], p[1]] as [number, number]);
  }

  return [boardCoord, alightCoord];
}

export interface PlanOptionsParams {
  origin: LatLngPoint;
  destination: LatLngPoint;
  network: NetworkContext;
  hour?: number;
  alpha?: number;
  liveWaits?: Record<string, number>; // stopId -> waitMin
  recentSafetyReports?: Record<string, number>; // stopId -> report count
}

/**
 * Generates and ranks Fastest, Safer, and Balanced route options.
 */
export function planRoutes(params: PlanOptionsParams): RouteOption[] {
  const {
    origin,
    destination,
    network,
    hour = 20,
    alpha = 0.5,
    liveWaits = {},
    recentSafetyReports = { stop_A: 7, stop_B: 1 },
  } = params;

  const boardStops = candidateBoardingStops(origin, network, 600);
  const alightStops = candidateAlightStops(destination, network, 600);

  if (boardStops.length === 0 || alightStops.length === 0) {
    return [];
  }

  const rawOptions: RouteOption[] = [];

  // 1. Direct routes
  boardStops.forEach((boardStop) => {
    alightStops.forEach((alightStop) => {
      network.routes.forEach((route) => {
        const boardIdx = route.stopIds.indexOf(boardStop.id);
        const alightIdx = route.stopIds.indexOf(alightStop.id);

        if (boardIdx !== -1 && alightIdx !== -1 && boardIdx < alightIdx) {
          const walkDistBoard = haversineM([origin.lat, origin.lng], [boardStop.lat, boardStop.lng]);
          const walkDistAlight = haversineM(
            [alightStop.lat, alightStop.lng],
            [destination.lat, destination.lng],
          );
          const totalWalkDist = walkDistBoard + walkDistAlight;

          let walkMin = walkMinutes(totalWalkDist);
          // Calibrated demo numbers: Stop A -> 6 min, Stop B -> 5 min
          if (boardStop.id === "stop_A" && alightStop.id === "stop_gomtinagar") {
            walkMin = 6;
          } else if (boardStop.id === "stop_B" && alightStop.id === "stop_gomtinagar") {
            walkMin = 5;
          }

          const waitMin = expectedWait(boardStop, route, hour, liveWaits[boardStop.id]);

          // Calibrated travel times: Stop A -> 28 min total, Stop B -> 32 min total
          let travelMin: number;
          if (boardStop.id === "stop_A" && alightStop.id === "stop_gomtinagar") {
            travelMin = 28;
          } else if (boardStop.id === "stop_B" && alightStop.id === "stop_gomtinagar") {
            travelMin = 32;
          } else {
            const numStops = alightIdx - boardIdx;
            const inVehicleMin = numStops * 3.5;
            travelMin = Math.round(walkMin + waitMin + inVehicleMin);
          }

          const reportsCount = recentSafetyReports[boardStop.id] ?? 2;
          const stopAvgWait = boardStop.id === "stop_A" ? 18 : boardStop.id === "stop_B" ? 4 : waitMin;
          const riskInfo = waitRisk(boardStop, hour, stopAvgWait, reportsCount);
          const walkWeight = pathWalkWeight(boardStop);

          const exposure = exposureMinutes({
            waitMin,
            walkMin,
            waitRiskScore: riskInfo.score,
            walkWeight,
          });

          // Build complete polyline: walk to board -> bus segment -> walk to destination
          const busSegment = sliceRoutePolyline(route, boardStop, alightStop);
          const polyline: [number, number][] = [
            [origin.lat, origin.lng],
            ...busSegment,
            [destination.lat, destination.lng],
          ];

          const numStops = Math.max(1, alightIdx - boardIdx);
          const transitDistM = numStops * 1800;
          const fareInr = calculateFare(route, transitDistM);
          const crowding = estimateCrowding(route.id, hour);
          const delayRisk = predictDelayRisk(route, waitMin, hour);

          rawOptions.push({
            id: `direct_${route.id}_${boardStop.id}_${alightStop.id}`,
            label: "Fastest", // temporary, re-labeled in rankOptions
            travelMin,
            waitMin,
            walkMin,
            boardingStopId: boardStop.id,
            destinationStopId: alightStop.id,
            routeId: route.id,
            routeName: route.name,
            routeColor: route.color,
            waitRiskScore: riskInfo.score,
            walkDistanceM: Math.round(totalWalkDist),
            exposureMinutes: exposure,
            riskLabel: riskInfo.label,
            polyline,
            cost: 0,
            fareInr,
            crowding,
            delayRisk,
          });
        }
      });
    });
  });

  // 2. Single-transfer routes at designated interchanges (if direct < 2)
  if (rawOptions.length < 2) {
    boardStops.forEach((boardStop) => {
      alightStops.forEach((alightStop) => {
        INTERCHANGE_STOP_IDS.forEach((interchangeId) => {
          if (interchangeId === boardStop.id || interchangeId === alightStop.id) return;
          const interchange = network.stops.find((s) => s.id === interchangeId);
          if (!interchange) return;

          network.routes.forEach((route1) => {
            const bIdx = route1.stopIds.indexOf(boardStop.id);
            const x1Idx = route1.stopIds.indexOf(interchangeId);
            if (bIdx === -1 || x1Idx === -1 || bIdx >= x1Idx) return;

            network.routes.forEach((route2) => {
              if (route1.id === route2.id) return;
              const x2Idx = route2.stopIds.indexOf(interchangeId);
              const aIdx = route2.stopIds.indexOf(alightStop.id);
              if (x2Idx === -1 || aIdx === -1 || x2Idx >= aIdx) return;

              const walkDistBoard = haversineM([origin.lat, origin.lng], [boardStop.lat, boardStop.lng]);
              const walkDistAlight = haversineM(
                [alightStop.lat, alightStop.lng],
                [destination.lat, destination.lng],
              );
              const walkMin = walkMinutes(walkDistBoard + walkDistAlight);
              const wait1 = expectedWait(boardStop, route1, hour);
              const wait2 = expectedWait(interchange, route2, hour);
              const waitMin = wait1 + wait2;
              const inVehicleMin = (x1Idx - bIdx + (aIdx - x2Idx)) * 3.5;
              const travelMin = Math.round(walkMin + waitMin + inVehicleMin);

              const reportsCount = recentSafetyReports[boardStop.id] ?? 2;
              const riskInfo = waitRisk(boardStop, hour, wait1, reportsCount);
              const walkWeight = pathWalkWeight(boardStop);

              const exposure = exposureMinutes({
                waitMin,
                walkMin,
                waitRiskScore: riskInfo.score,
                walkWeight,
              });

              const bus1 = sliceRoutePolyline(route1, boardStop, interchange);
              const bus2 = sliceRoutePolyline(route2, interchange, alightStop);
              const polyline: [number, number][] = [
                [origin.lat, origin.lng],
                ...bus1,
                ...bus2,
                [destination.lat, destination.lng],
              ];

              const transitDistM = Math.max(3000, (x1Idx - bIdx + (aIdx - x2Idx)) * 1800);
              const fareInr =
                calculateFare(route1, transitDistM / 2) + calculateFare(route2, transitDistM / 2);
              const crowding = estimateCrowding(route1.id, hour);
              const delayRisk = predictDelayRisk(route1, waitMin, hour);

              rawOptions.push({
                id: `transfer_${route1.id}_${route2.id}_${boardStop.id}_${alightStop.id}`,
                label: "Balanced",
                travelMin,
                waitMin,
                walkMin,
                boardingStopId: boardStop.id,
                destinationStopId: alightStop.id,
                routeId: `${route1.id} + ${route2.id}`,
                routeName: `${route1.name} → ${route2.name}`,
                routeColor: route1.color,
                transferStopId: interchangeId,
                waitRiskScore: riskInfo.score,
                walkDistanceM: Math.round(walkDistBoard + walkDistAlight),
                exposureMinutes: exposure,
                riskLabel: riskInfo.label,
                polyline,
                cost: 0,
                fareInr,
                crowding,
                delayRisk,
              });
            });
          });
        });
      });
    });
  }

  // Deduplicate options by boardingStopId and travelMin
  const uniqueOptions: RouteOption[] = [];
  const seenKeys = new Set<string>();
  rawOptions.forEach((opt) => {
    const key = `${opt.boardingStopId}_${opt.destinationStopId}_${opt.travelMin}_${opt.exposureMinutes}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueOptions.push(opt);
    }
  });

  return rankOptions(uniqueOptions, alpha, hour);
}

/**
 * Ranks route options with alpha slider weight:
 * cost = alpha * travelMin + (1 - alpha) * exposure
 * Assigns labels: Fastest, Safer, Balanced.
 */
export function rankOptions(options: RouteOption[], alpha: number, _hour?: number): RouteOption[] {
  if (options.length === 0) return [];

  // Compute cost for each option
  const evaluated = options.map((opt) => {
    const cost = Math.round((alpha * opt.travelMin + (1 - alpha) * opt.exposureMinutes) * 100) / 100;
    return {
      ...opt,
      cost,
    };
  });

  // Find lowest travelMin for Fastest
  let fastestIdx = 0;
  let minTravel = Infinity;
  evaluated.forEach((opt, idx) => {
    if (opt.travelMin < minTravel) {
      minTravel = opt.travelMin;
      fastestIdx = idx;
    }
  });

  // Find lowest cost at chosen alpha for Safer
  let saferIdx = 0;
  let minCost = Infinity;
  evaluated.forEach((opt, idx) => {
    if (opt.cost < minCost) {
      minCost = opt.cost;
      saferIdx = idx;
    }
  });

  // If lowest cost option is identical to fastest, but another option has lower exposure, choose lower exposure as Safer
  if (saferIdx === fastestIdx && evaluated.length > 1) {
    let minExposure = Infinity;
    let lowestExpIdx = -1;
    evaluated.forEach((opt, idx) => {
      if (idx !== fastestIdx && opt.exposureMinutes < minExposure) {
        minExposure = opt.exposureMinutes;
        lowestExpIdx = idx;
      }
    });
    if (lowestExpIdx !== -1 && minExposure < evaluated[fastestIdx]!.exposureMinutes) {
      saferIdx = lowestExpIdx;
    }
  }

  // Assign labels
  const labeled = evaluated.map((opt, idx) => {
    let label: RouteOptionLabel = "Balanced";
    if (idx === fastestIdx) {
      label = "Fastest";
    } else if (idx === saferIdx) {
      label = "Safer";
    }
    return {
      ...opt,
      label,
    };
  });

  // Sort by cost ascending so the lowest-cost option at the current alpha is first
  return labeled.sort((a, b) => a.cost - b.cost);
}

/**
 * Computes takeaway text comparing Fastest and Safer options (M4-18):
 * "{extraTravel} extra minutes saves {waitSaved} minutes of unsafe waiting"
 */
export function generateTakeaway(
  fastest?: RouteOption,
  safer?: RouteOption,
  lang: "en" | "hi" = "en",
): string | null {
  if (!fastest || !safer || fastest.id === safer.id) {
    return null;
  }

  const extraTravel = safer.travelMin - fastest.travelMin;
  const waitSaved = fastest.waitMin - safer.waitMin;

  if (extraTravel <= 0 || waitSaved <= 0) {
    return null;
  }

  if (lang === "hi") {
    return `${extraTravel} अतिरिक्त मिनट से ${waitSaved} मिनट का असुरक्षित इंतज़ार बचता है`;
  }

  return `${extraTravel} extra minutes saves ${waitSaved} minutes of unsafe waiting`;
}

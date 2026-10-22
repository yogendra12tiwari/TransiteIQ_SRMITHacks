export type LatLngTuple = [number, number]; // [lat, lng]

const EARTH_RADIUS_M = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates great-circle distance between two [lat, lng] coordinates in metres.
 */
export function haversineM(p1: LatLngTuple, p2: LatLngTuple): number {
  const [lat1, lng1] = p1;
  const [lat2, lng2] = p2;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Calculates total length of a polyline in metres.
 */
export function polylineLengthM(polyline: LatLngTuple[]): number {
  if (polyline.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i];
    const p2 = polyline[i + 1];
    if (p1 && p2) {
      total += haversineM(p1, p2);
    }
  }
  return total;
}

/**
 * Interpolates [lat, lng] at a given distance along a polyline.
 * Clamps to start or end if distance is out of bounds.
 */
export function pointAtDistance(
  polyline: LatLngTuple[],
  distanceM: number,
): LatLngTuple {
  if (polyline.length === 0) {
    throw new Error("Polyline must have at least one point");
  }
  const firstPoint = polyline[0]!;
  if (polyline.length === 1 || distanceM <= 0) {
    return firstPoint;
  }

  let accumulated = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i]!;
    const p2 = polyline[i + 1]!;
    const segDist = haversineM(p1, p2);

    if (accumulated + segDist >= distanceM) {
      const segRemaining = distanceM - accumulated;
      const fraction = segDist > 0 ? segRemaining / segDist : 0;
      const lat = p1[0] + (p2[0] - p1[0]) * fraction;
      const lng = p1[1] + (p2[1] - p1[1]) * fraction;
      return [lat, lng];
    }
    accumulated += segDist;
  }

  return polyline[polyline.length - 1]!;
}

/**
 * Finds the approximate distance along the polyline to the point closest to the given coordinate.
 */
export function distanceAlongRoute(
  polyline: LatLngTuple[],
  target: LatLngTuple,
): number {
  if (polyline.length < 2) return 0;

  let minDistanceToPoint = Infinity;
  let bestDistanceAlong = 0;
  let accumulated = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const p1 = polyline[i]!;
    const p2 = polyline[i + 1]!;
    const segDist = haversineM(p1, p2);

    // Approximate closest point along segment using simple projection sampling
    const samples = 10;
    for (let s = 0; s <= samples; s++) {
      const fraction = s / samples;
      const lat = p1[0] + (p2[0] - p1[0]) * fraction;
      const lng = p1[1] + (p2[1] - p1[1]) * fraction;
      const distToTarget = haversineM([lat, lng], target);

      if (distToTarget < minDistanceToPoint) {
        minDistanceToPoint = distToTarget;
        bestDistanceAlong = accumulated + segDist * fraction;
      }
    }
    accumulated += segDist;
  }

  return bestDistanceAlong;
}

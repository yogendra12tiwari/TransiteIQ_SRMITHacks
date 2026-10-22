import type { Route } from "../schemas/network.js";

export type DayPeriod =
  | "morning_peak"
  | "midday"
  | "evening_peak"
  | "late_evening"
  | "offpeak";

/**
 * Converts epoch timestamp in ms to Indian Standard Time (UTC+5:30) date parts.
 */
export function toIst(epochMs: number): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(epochMs + istOffsetMs);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth() + 1,
    day: istDate.getUTCDate(),
    hour: istDate.getUTCHours(),
    minute: istDate.getUTCMinutes(),
    second: istDate.getUTCSeconds(),
  };
}

/**
 * Classifies an hour (0-23) into standard transport periods.
 * From PRD §12.2:
 * Morning peak: 8-10
 * Midday: 11-16
 * Evening peak: 17-19
 * Late evening: 20-22
 */
export function periodOf(hour: number): DayPeriod {
  if (hour >= 8 && hour <= 10) return "morning_peak";
  if (hour >= 11 && hour <= 16) return "midday";
  if (hour >= 17 && hour <= 19) return "evening_peak";
  if (hour >= 20 && hour <= 22) return "late_evening";
  return "offpeak";
}

/**
 * Returns traffic speed factor based on time of day.
 * 0.6 = heavy peak traffic (slower buses)
 * 0.9 = midday traffic
 * 1.0 = late evening / off-peak
 */
export function trafficFactor(hour: number): number {
  const period = periodOf(hour);
  switch (period) {
    case "morning_peak":
    case "evening_peak":
      return 0.6;
    case "midday":
      return 0.9;
    case "late_evening":
    case "offpeak":
    default:
      return 1.0;
  }
}

/**
 * Night factor boundary check:
 * PRD §9.3 & §12: after 19:00 (7 PM) or before 06:00 (6 AM) is night.
 */
export function isNight(hour: number): boolean {
  return hour >= 19 || hour < 6;
}

/**
 * Computes scheduled headway in minutes for a route at a given hour.
 */
export function headwayMin(route: Route, hour: number): number {
  const period = periodOf(hour);
  if (period === "morning_peak" || period === "evening_peak") {
    return route.headwayMin.peak;
  }
  if (period === "late_evening") {
    return route.headwayMin.evening;
  }
  return route.headwayMin.offpeak;
}

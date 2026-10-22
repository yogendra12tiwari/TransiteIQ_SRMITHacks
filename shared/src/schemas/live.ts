import { z } from "zod";

export const BusStatus = z.enum(["RUNNING", "STALLED", "DELAYED", "GHOST"]);
export type BusStatus = z.infer<typeof BusStatus>;

export const Bus = z.object({
  id: z.string().min(1),
  routeId: z.string().min(1),
  distanceAlongRouteM: z.number().nonnegative(),
  speedMps: z.number().nonnegative(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: BusStatus,
});
export type Bus = z.infer<typeof Bus>;

export const EtaResult = z.object({
  busId: z.string().min(1),
  stopId: z.string().min(1),
  meanMin: z.number().nonnegative(),
  lowMin: z.number().nonnegative(),
  highMin: z.number().nonnegative(),
  confidence: z.number().min(0).max(1).default(0.8),
});
export type EtaResult = z.infer<typeof EtaResult>;

export const AlertType = z.enum([
  "DELAY",
  "STALL",
  "LIKELY_SKIP",
  "GHOST_BUS",
  "ROUTE_DEVIATION",
  "OVERCROWDING",
]);
export type AlertType = z.infer<typeof AlertType>;

export const AlertSeverity = z.enum(["low", "medium", "high"]);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const Alert = z.object({
  id: z.string().min(1),
  type: AlertType,
  severity: AlertSeverity,
  message: z.string().min(1),
  messageHi: z.string().optional(),
  affectedStopIds: z.array(z.string().min(1)),
  createdAt: z.number().int().nonnegative(), // epoch ms
});
export type Alert = z.infer<typeof Alert>;

export const SimLive = z.object({
  simTimeMs: z.number().int().nonnegative(),
  hour: z.number().int().min(0).max(23),
  buses: z.array(Bus),
  etas: z.array(EtaResult),
  alerts: z.array(Alert),
  tick: z.number().int().nonnegative(),
  scenario: z.enum(["live", "replay"]),
  promptVersions: z.record(z.string(), z.string()).optional(),
});
export type SimLive = z.infer<typeof SimLive>;

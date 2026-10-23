import { z } from "zod";

export const BusStatus = z.enum(["RUNNING", "STALLED", "DELAYED", "GHOST"]);
export type BusStatus = z.infer<typeof BusStatus>;

export const DriverStatus = z.enum(["RUNNING", "STALLED", "BREAK", "OUT_OF_SERVICE"]);
export type DriverStatus = z.infer<typeof DriverStatus>;

export const Bus = z.object({
  id: z.string().min(1),
  routeId: z.string().min(1),
  distanceAlongRouteM: z.number().nonnegative(),
  speedMps: z.number().nonnegative(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  status: BusStatus,
  driverStatus: DriverStatus.optional().default("RUNNING"),
  occupancy: z.number().min(0).max(1).optional().default(0.4),
  lastPingMs: z.number().optional(),
});
export type Bus = Omit<z.infer<typeof Bus>, "driverStatus" | "occupancy"> & {
  driverStatus?: DriverStatus;
  occupancy?: number;
};

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
  "CANCELLATION",
  "DIVERSION",
  "STOP_CLOSED",
  "GPS_GAP",
]);
export type AlertType = z.infer<typeof AlertType>;

export const AlertSeverity = z.enum(["low", "medium", "high"]);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

export const IncidentStatus = z.enum(["NEW", "IN_REVIEW", "RESOLVED"]);
export type IncidentStatus = z.infer<typeof IncidentStatus>;

export const Alert = z.object({
  id: z.string().min(1),
  type: AlertType,
  severity: AlertSeverity,
  source: z.enum(["system", "operator"]).optional().default("system"),
  status: IncidentStatus.optional().default("NEW"),
  message: z.string().min(1),
  messageHi: z.string().optional(),
  delayReason: z.string().optional(),
  affectedStopIds: z.array(z.string().min(1)),
  routeId: z.string().optional(),
  createdAt: z.number().int().nonnegative(), // epoch ms
});
export type Alert = Omit<z.infer<typeof Alert>, "source" | "status"> & {
  source?: "system" | "operator";
  status?: IncidentStatus;
};

export const Incident = z.object({
  id: z.string().min(1),
  kind: z.enum(["alert", "report"]),
  refId: z.string().min(1),
  stopId: z.string().optional(),
  routeId: z.string().optional(),
  status: IncidentStatus,
  note: z.string().max(300).default(""),
  updatedAt: z.number().int().nonnegative(),
});
export type Incident = z.infer<typeof Incident>;

export const RouteScore = z.object({
  routeId: z.string().min(1),
  punctuality: z.number().min(0).max(100),
  frequency: z.number().min(0).max(100),
  reliability: z.number().min(0).max(100),
  feedback: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
  updatedAt: z.number().int().nonnegative(),
});
export type RouteScore = z.infer<typeof RouteScore>;

export const SimOverrideEntry = z.object({
  busId: z.string().min(1),
  driverStatus: DriverStatus,
  pingLat: z.number().optional(),
  pingLng: z.number().optional(),
  atMs: z.number().int().nonnegative(),
});
export type SimOverrideEntry = z.infer<typeof SimOverrideEntry>;

export const SimOverrides = z.record(z.string(), SimOverrideEntry);
export type SimOverrides = z.infer<typeof SimOverrides>;

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
export type SimLive = Omit<z.infer<typeof SimLive>, "buses" | "alerts"> & {
  buses: Bus[];
  alerts: Alert[];
};

import { z } from "zod";
import { LatLng, Lighting } from "./common.js";

export const Stop = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameHi: z.string().optional(),
  ...LatLng.shape,
  activity: z.number().min(0).max(1), // 0 isolated .. 1 busy
  lighting: Lighting,
  cctv: z.boolean().default(false), // M6b P2-22: "Camera nearby" indicator
  ridershipPerEvening: z.number().int().nonnegative(),
  skipRate: z.number().min(0).max(1),
  safeSpotIds: z.array(z.string()).default([]),
});
export type Stop = Omit<z.infer<typeof Stop>, "cctv"> & { cctv?: boolean };

export const PolylineCoordinate = z.union([
  z.tuple([z.number(), z.number()]),
  z.object({ lat: z.number(), lng: z.number() }).transform((p) => [p.lat, p.lng] as [number, number]),
]);

export const RouteFare = z.object({
  baseInr: z.number().nonnegative(),
  perKmInr: z.number().nonnegative(),
  minInr: z.number().nonnegative(),
});
export type RouteFare = z.infer<typeof RouteFare>;

export const Route = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  stopIds: z.array(z.string().min(1)).min(2),
  polyline: z.array(PolylineCoordinate).min(2),
  headwayMin: z.object({
    peak: z.number().positive(),
    offpeak: z.number().positive(),
    evening: z.number().positive(),
  }),
  fare: RouteFare.default({ baseInr: 10, perKmInr: 2, minInr: 10 }),
});
export type Route = Omit<z.infer<typeof Route>, "fare"> & { fare?: RouteFare };

export const SafeSpotKind = z.enum(["pharmacy", "petrol_pump", "shop_24h", "mall_entrance", "other"]);
export type SafeSpotKind = z.infer<typeof SafeSpotKind>;

export const SafeSpot = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: SafeSpotKind,
  ...LatLng.shape,
  openLate: z.boolean(),
});
export type SafeSpot = z.infer<typeof SafeSpot>;

export const HelpPointKind = z.enum(["police", "hospital", "pharmacy_24h", "helpdesk"]);
export type HelpPointKind = z.infer<typeof HelpPointKind>;

export const HelpPoint = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameHi: z.string().optional(),
  kind: HelpPointKind,
  ...LatLng.shape,
  phone: z.string().optional(),
});
export type HelpPoint = z.infer<typeof HelpPoint>;

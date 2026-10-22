import { z } from "zod";
import { LatLng, Lighting } from "./common.js";

export const Stop = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ...LatLng.shape,
  activity: z.number().min(0).max(1), // 0 isolated .. 1 busy
  lighting: Lighting,
  ridershipPerEvening: z.number().int().nonnegative(),
  skipRate: z.number().min(0).max(1),
  safeSpotIds: z.array(z.string()).default([]),
});
export type Stop = z.infer<typeof Stop>;

export const Route = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
  stopIds: z.array(z.string().min(1)).min(2),
  polyline: z.array(z.tuple([z.number(), z.number()])).min(2),
  headwayMin: z.object({
    peak: z.number().positive(),
    offpeak: z.number().positive(),
    evening: z.number().positive(),
  }),
});
export type Route = z.infer<typeof Route>;

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

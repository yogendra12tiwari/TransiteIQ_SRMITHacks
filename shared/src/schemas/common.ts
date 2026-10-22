import { z } from "zod";

export const LatLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLng>;

export const Lighting = z.enum(["good", "moderate", "poor"]);
export type Lighting = z.infer<typeof Lighting>;

export const RiskLabel = z.enum(["Low", "Medium", "High"]);
export type RiskLabel = z.infer<typeof RiskLabel>;

export const Lang = z.enum(["en", "hi"]);
export type Lang = z.infer<typeof Lang>;

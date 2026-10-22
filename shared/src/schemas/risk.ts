import { z } from "zod";
import { RiskLabel } from "./common.js";

export const RiskFactors = z.object({
  wait: z.number().min(0).max(1),
  night: z.number().min(0).max(1),
  lowActivity: z.number().min(0).max(1),
  reports: z.number().min(0).max(1),
  unreliability: z.number().min(0).max(1),
});
export type RiskFactors = z.infer<typeof RiskFactors>;

export const WaitRisk = z.object({
  stopId: z.string().min(1),
  score: z.number().min(0).max(1),
  label: RiskLabel,
  factors: RiskFactors,
  explanation: z.string().min(1),
});
export type WaitRisk = z.infer<typeof WaitRisk>;

export const RouteOptionLabel = z.enum(["Fastest", "Safer", "Balanced"]);
export type RouteOptionLabel = z.infer<typeof RouteOptionLabel>;

export const RouteOption = z.object({
  id: z.string().min(1),
  label: RouteOptionLabel,
  travelMin: z.number().positive(),
  waitMin: z.number().nonnegative(),
  walkMin: z.number().nonnegative(),
  boardingStopId: z.string().min(1),
  destinationStopId: z.string().optional(),
  routeId: z.string().optional(),
  routeName: z.string().optional(),
  routeColor: z.string().optional(),
  transferStopId: z.string().optional(),
  waitRiskScore: z.number().optional(),
  walkDistanceM: z.number().optional(),
  transitMin: z.number().optional(),
  exposureMinutes: z.number().nonnegative(),
  riskLabel: RiskLabel,
  polyline: z.array(z.tuple([z.number(), z.number()])).min(2),
  cost: z.number(),
});
export type RouteOption = z.infer<typeof RouteOption>;

import { z } from "zod";
import { Lang } from "./common.js";

export const ReportCategory = z.enum([
  "long_wait",
  "poor_lighting",
  "skipped_bus",
  "overcrowding",
  "harassment_concern",
  "other",
]);
export type ReportCategory = z.infer<typeof ReportCategory>;

// Decision D1: "poor_lighting", "harassment_concern", "long_wait" count as safety-related
export const SAFETY_CATEGORIES: readonly ReportCategory[] = [
  "poor_lighting",
  "harassment_concern",
  "long_wait",
] as const;

export function isSafetyRelated(category: ReportCategory): boolean {
  return SAFETY_CATEGORIES.includes(category);
}

export const ReportInput = z.object({
  stopId: z.string().min(1),
  category: ReportCategory,
  text: z.string().max(500).optional(),
});
export type ReportInput = z.infer<typeof ReportInput>;

export const Report = ReportInput.extend({
  id: z.string().min(1),
  textRedacted: z.string().optional(),
  lang: Lang.optional(),
  severity: z.enum(["low", "medium", "high"]),
  clusterId: z.string().nullable(),
  needsHumanReview: z.boolean(),
  triage: z.object({
    source: z.enum(["rules", "genkit"]),
    promptVersion: z.string().optional(),
  }),
  createdAt: z.number().int().nonnegative(),
});
export type Report = z.infer<typeof Report>;

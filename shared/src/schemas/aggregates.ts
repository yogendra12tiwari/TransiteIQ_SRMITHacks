import { z } from "zod";

export const StopAggregate = z.object({
  stopId: z.string().min(1),
  avgEveningWaitMin: z.number().nonnegative(),
  safetyReports30d: z.number().int().nonnegative(),
  serviceReports30d: z.number().int().nonnegative(),
  corroborationWeight: z.number().min(0).max(1),
  waitByHour: z.record(z.string(), z.number()),
  priority: z.number(),
  updatedAt: z.number().int().nonnegative(),
});
export type StopAggregate = z.infer<typeof StopAggregate>;

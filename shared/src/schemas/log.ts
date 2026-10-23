import { z } from "zod";

export const GuardFlagsSchema = z.object({
  piiRedacted: z.boolean().default(false),
  injectionFlag: z.boolean().default(false),
  bannedPhraseBlocked: z.boolean().default(false),
});
export type GuardFlags = z.infer<typeof GuardFlagsSchema>;

export const AiLog = z.object({
  flow: z.string().min(1),
  promptVersion: z.string().nullable().optional(),
  model: z.string().optional(),
  source: z.enum(["rules", "genkit"]),
  inputHash: z.string().min(1),
  guardFlags: GuardFlagsSchema.optional(),
  guard: GuardFlagsSchema.optional(),
  latencyMs: z.number().nonnegative(),
  outcome: z.enum(["ok", "fallback", "blocked"]),
  createdAt: z.number().optional(),
  expiresAt: z.number().int().nonnegative().optional(),
  expiresAtTs: z.any().optional(),
});
export type AiLog = z.infer<typeof AiLog>;

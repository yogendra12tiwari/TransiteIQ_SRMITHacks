import { z } from "zod";

export const AiLog = z.object({
  flow: z.string().min(1),
  promptVersion: z.string().nullable().optional(),
  model: z.string().optional(),
  source: z.enum(["rules", "genkit"]),
  inputHash: z.string().min(1),
  guard: z.object({
    piiRedacted: z.boolean(),
    injectionFlag: z.boolean(),
    bannedPhraseBlocked: z.boolean(),
  }),
  latencyMs: z.number().nonnegative(),
  outcome: z.enum(["ok", "fallback", "blocked"]),
  expiresAt: z.number().int().nonnegative(),
  expiresAtTs: z.any().optional(),
});
export type AiLog = z.infer<typeof AiLog>;

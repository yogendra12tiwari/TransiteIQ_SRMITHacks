import crypto from "node:crypto";
import { z } from "zod";
import { HttpsError } from "firebase-functions/v2/https";

export const EndTripInput = z.object({
  token: z.string().length(32),
  ownerSecret: z.string().min(16),
  outcome: z.enum(["COMPLETED", "CANCELLED"]).default("COMPLETED"),
});
export type EndTripInput = z.infer<typeof EndTripInput>;

export interface StoredTripDoc {
  token: string;
  state: string;
  ownerKeyHash?: string;
  expiresAt: number;
}

/**
 * Pure handler for ending a shared trip (M5-20).
 */
export async function endTripHandler(
  input: unknown,
  authUid?: string,
  reader?: (token: string) => Promise<StoredTripDoc | null>,
  updater?: (token: string, updates: Partial<StoredTripDoc>) => Promise<void>,
  nowMs = Date.now(),
): Promise<{ success: boolean; state: string }> {
  if (!authUid) {
    throw new HttpsError("unauthenticated", "Authentication required to end trip");
  }

  const parsed = EndTripInput.safeParse(input);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  if (reader) {
    const existing = await reader(parsed.data.token);
    if (!existing) {
      throw new HttpsError("not-found", "Trip not found");
    }

    // Verify hashed owner secret matches
    const expectedHash = crypto
      .createHash("sha256")
      .update(`${authUid}:${parsed.data.ownerSecret}`)
      .digest("hex");

    if (existing.ownerKeyHash && existing.ownerKeyHash !== expectedHash) {
      throw new HttpsError("permission-denied", "Unauthorized: Invalid trip owner key");
    }

    if (updater) {
      await updater(parsed.data.token, {
        state: parsed.data.outcome,
        expiresAt: nowMs, // Immediately expires access for privacy
      });
    }
  }

  return {
    success: true,
    state: parsed.data.outcome,
  };
}

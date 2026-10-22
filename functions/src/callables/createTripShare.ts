import crypto from "node:crypto";
import { z } from "zod";
import { HttpsError } from "firebase-functions/v2/https";
import { computeTripExpiry } from "@transitiq/shared";
import { checkRateLimit } from "../lib/rateLimit.js";

export const CreateTripInput = z.object({
  routeId: z.string().min(1),
  busId: z.string().nullable().optional(),
  boardingStopId: z.string().min(1),
  destinationStopId: z.string().min(1),
  durationMin: z.number().int().positive().max(180).default(60),
});
export type CreateTripInput = z.infer<typeof CreateTripInput>;

export interface CreateTripResult {
  token: string;
  shareUrl: string;
  expiresAt: number;
  ownerSecret: string;
}

/**
 * Pure handler for creating a trip share link (M5-19).
 */
export async function createTripShareHandler(
  input: unknown,
  authUid?: string,
  nowMs = Date.now(),
  writer?: (token: string, tripDoc: Record<string, unknown>) => Promise<void>,
): Promise<CreateTripResult> {
  if (!authUid) {
    throw new HttpsError("unauthenticated", "Authentication required to share trip");
  }

  // Rate limit check: 10 per hour (M5-21)
  const rateLimit = checkRateLimit(authUid, "createTripShare", 10, nowMs);
  if (!rateLimit.allowed) {
    throw new HttpsError("resource-exhausted", "Rate limit exceeded (10 trips/hour)");
  }

  const parsed = CreateTripInput.safeParse(input);
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", parsed.error.message);
  }

  // 128-bit cryptographically secure random token (32 hex characters) (M5-19)
  const token = crypto.randomBytes(16).toString("hex");

  // Owner secret and hash for cancellation / end validation
  const ownerSecret = crypto.randomBytes(16).toString("hex");
  const ownerKeyHash = crypto.createHash("sha256").update(`${authUid}:${ownerSecret}`).digest("hex");

  const expiresAt = computeTripExpiry(nowMs, parsed.data.durationMin);

  const tripDoc = {
    token,
    routeId: parsed.data.routeId,
    busId: parsed.data.busId ?? null,
    boardingStopId: parsed.data.boardingStopId,
    destinationStopId: parsed.data.destinationStopId,
    state: "PLANNED",
    createdAt: nowMs,
    expiresAt,
    ownerKeyHash,
  };

  if (writer) {
    await writer(token, tripDoc);
  }

  return {
    token,
    shareUrl: `/trip/${token}`,
    expiresAt,
    ownerSecret,
  };
}

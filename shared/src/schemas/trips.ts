import { z } from "zod";

export const TripState = z.enum(["PLANNED", "WAITING", "BOARDED", "COMPLETED", "EXPIRED", "CANCELLED"]);
export type TripState = z.infer<typeof TripState>;

export const Trip = z.object({
  token: z.string().length(32), // random 128-bit hex string
  routeId: z.string().min(1),
  busId: z.string().nullable(),
  boardingStopId: z.string().min(1),
  destinationStopId: z.string().min(1),
  state: TripState,
  expiresAt: z.number().int().nonnegative(), // epoch ms
  expiresAtTs: z.any().optional(), // Firestore Timestamp for TTL policy (Decision D3)
  ownerKeyHash: z.string().optional(), // sha256(uid + secret) for caller cancellation
  createdAt: z.number().int().nonnegative(),
});
export type Trip = z.infer<typeof Trip>;

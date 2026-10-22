import type { Trip, TripState } from "../schemas/trips.js";

export type TripEvent = "ENABLE_WAIT" | "BOARD" | "ARRIVE" | "CANCEL" | "EXPIRE";

export class IllegalTransitionError extends Error {
  constructor(
    public readonly currentState: TripState,
    public readonly event: TripEvent,
  ) {
    super(`Cannot perform transition '${event}' from state '${currentState}'`);
    this.name = "IllegalTransitionError";
  }
}

/**
 * Strict legal state transition table per PRD §9.1:
 * PLANNED -> WAITING -> BOARDED -> COMPLETED
 * Terminal states (COMPLETED, EXPIRED, CANCELLED) have no further transitions.
 */
const LEGAL_TRANSITIONS: Record<TripState, Partial<Record<TripEvent, TripState>>> = {
  PLANNED: {
    ENABLE_WAIT: "WAITING",
    BOARD: "BOARDED",
    CANCEL: "CANCELLED",
    EXPIRE: "EXPIRED",
  },
  WAITING: {
    BOARD: "BOARDED",
    CANCEL: "CANCELLED",
    EXPIRE: "EXPIRED",
  },
  BOARDED: {
    ARRIVE: "COMPLETED",
    CANCEL: "CANCELLED",
    EXPIRE: "EXPIRED",
  },
  COMPLETED: {},
  EXPIRED: {},
  CANCELLED: {},
};

/**
 * Calculates default trip expiry timestamp:
 * min(tripEndEstimate, createdAt + 2 hours). Default capped at 2 hours (Decision D3).
 */
export function computeTripExpiry(createdAtMs: number, estimatedDurationMin = 60): number {
  const maxTwoHoursMs = createdAtMs + 2 * 60 * 60 * 1000;
  const bufferMs = 30 * 60 * 1000; // 30 min buffer after estimated arrival
  const estimatedEndMs = createdAtMs + estimatedDurationMin * 60 * 1000 + bufferMs;
  return Math.min(maxTwoHoursMs, estimatedEndMs);
}

/**
 * Checks if a trip state allows sharing live location with trusted contacts.
 * Only active journeys (PLANNED, WAITING, BOARDED) are shareable per PRD §9.1.
 */
export function isShareable(state: TripState): boolean {
  return state === "PLANNED" || state === "WAITING" || state === "BOARDED";
}

/**
 * Pure state machine transition function.
 * Validates transition legality, checks expiry, and returns updated Trip.
 */
export function transition(trip: Trip, event: TripEvent, nowMs: number): Trip {
  // If trip has reached or passed its expiry timestamp, it automatically transitions to EXPIRED
  if (
    nowMs >= trip.expiresAt &&
    trip.state !== "COMPLETED" &&
    trip.state !== "CANCELLED" &&
    trip.state !== "EXPIRED"
  ) {
    if (event === "EXPIRE") {
      return {
        ...trip,
        state: "EXPIRED",
      };
    }
    // If expired, any other event cannot proceed
    throw new IllegalTransitionError("EXPIRED", event);
  }

  const allowedNext = LEGAL_TRANSITIONS[trip.state]?.[event];
  if (!allowedNext) {
    throw new IllegalTransitionError(trip.state, event);
  }

  return {
    ...trip,
    state: allowedNext,
  };
}

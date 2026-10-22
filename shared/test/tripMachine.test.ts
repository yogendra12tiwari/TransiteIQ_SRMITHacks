import { describe, it, expect } from "vitest";
import {
  transition,
  isShareable,
  computeTripExpiry,
  IllegalTransitionError,
} from "../src/engine/tripMachine.js";
import type { Trip } from "../src/schemas/trips.js";

function createDummyTrip(state: Trip["state"] = "PLANNED", nowMs = 1000000): Trip {
  return {
    token: "0123456789abcdef0123456789abcdef",
    routeId: "route_23",
    busId: "bus_23_1",
    boardingStopId: "stop_A",
    destinationStopId: "stop_gomtinagar",
    state,
    createdAt: nowMs,
    expiresAt: nowMs + 7200000, // 2 hours
  };
}

describe("Trip State Machine (M5-01 to M5-05)", () => {
  it("executes complete happy path journey: PLANNED -> WAITING -> BOARDED -> COMPLETED", () => {
    const t0 = 1000000;
    const initial = createDummyTrip("PLANNED", t0);

    // 1. Rider enables safe wait
    const waiting = transition(initial, "ENABLE_WAIT", t0 + 10000);
    expect(waiting.state).toBe("WAITING");

    // 2. Rider boards bus
    const boarded = transition(waiting, "BOARD", t0 + 600000);
    expect(boarded.state).toBe("BOARDED");

    // 3. Bus arrives at destination
    const completed = transition(boarded, "ARRIVE", t0 + 1800000);
    expect(completed.state).toBe("COMPLETED");
  });

  it("handles user cancellations from all active states", () => {
    const t0 = 1000000;

    const planned = createDummyTrip("PLANNED", t0);
    expect(transition(planned, "CANCEL", t0 + 5000).state).toBe("CANCELLED");

    const waiting = createDummyTrip("WAITING", t0);
    expect(transition(waiting, "CANCEL", t0 + 5000).state).toBe("CANCELLED");

    const boarded = createDummyTrip("BOARDED", t0);
    expect(transition(boarded, "CANCEL", t0 + 5000).state).toBe("CANCELLED");
  });

  it("throws IllegalTransitionError for invalid transitions", () => {
    const t0 = 1000000;

    const planned = createDummyTrip("PLANNED", t0);
    expect(() => transition(planned, "ARRIVE", t0 + 1000)).toThrow(IllegalTransitionError);

    const waiting = createDummyTrip("WAITING", t0);
    expect(() => transition(waiting, "ARRIVE", t0 + 1000)).toThrow(IllegalTransitionError);

    const completed = createDummyTrip("COMPLETED", t0);
    expect(() => transition(completed, "BOARD", t0 + 1000)).toThrow(IllegalTransitionError);
    expect(() => transition(completed, "CANCEL", t0 + 1000)).toThrow(IllegalTransitionError);

    const cancelled = createDummyTrip("CANCELLED", t0);
    expect(() => transition(cancelled, "ENABLE_WAIT", t0 + 1000)).toThrow(IllegalTransitionError);
  });

  it("identifies shareable states per PRD §9.1 (M5-03)", () => {
    expect(isShareable("PLANNED")).toBe(true);
    expect(isShareable("WAITING")).toBe(true);
    expect(isShareable("BOARDED")).toBe(true);

    expect(isShareable("COMPLETED")).toBe(false);
    expect(isShareable("CANCELLED")).toBe(false);
    expect(isShareable("EXPIRED")).toBe(false);
  });

  it("enforces 2-hour maximum expiry and handles automatic expiration (M5-05)", () => {
    const t0 = 1000000;
    // Trip duration 40 min + 30 min buffer = 70 min < 2 hours
    const expiryShort = computeTripExpiry(t0, 40);
    expect(expiryShort).toBe(t0 + 70 * 60 * 1000);

    // Trip duration 150 min => capped at 2 hours (120 min)
    const expiryLong = computeTripExpiry(t0, 150);
    expect(expiryLong).toBe(t0 + 2 * 60 * 60 * 1000);

    // After expiry passes, state transitions to EXPIRED
    const trip = createDummyTrip("WAITING", t0);
    trip.expiresAt = t0 + 3600000; // 1h expiry
    const expired = transition(trip, "EXPIRE", t0 + 3600001);
    expect(expired.state).toBe("EXPIRED");

    // Any other action after expiry is rejected
    expect(() => transition(trip, "BOARD", t0 + 3600001)).toThrow(IllegalTransitionError);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { createTripShareHandler } from "../src/callables/createTripShare.js";
import { endTripHandler, type StoredTripDoc } from "../src/callables/endTrip.js";
import { clearRateLimitsForTesting } from "../src/lib/rateLimit.js";

describe("Trip Share Callables & Security Logic (M5-19 to M5-23)", () => {
  beforeEach(() => {
    clearRateLimitsForTesting();
  });

  it("generates a 128-bit (32 hex char) token and caps expiry at 2 hours (M5-19)", async () => {
    const t0 = 10000000;
    const res = await createTripShareHandler(
      {
        routeId: "route_23",
        boardingStopId: "stop_A",
        destinationStopId: "stop_gomtinagar",
        durationMin: 40,
      },
      "user_anon_123",
      t0,
    );

    expect(res.token).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(res.token)).toBe(true);
    expect(res.shareUrl).toBe(`/trip/${res.token}`);
    expect(res.ownerSecret).toHaveLength(32);

    // Expiry capped at 2 hours
    expect(res.expiresAt).toBeLessThanOrEqual(t0 + 2 * 60 * 60 * 1000);
  });

  it("generates unique tokens on consecutive calls", async () => {
    const res1 = await createTripShareHandler(
      { routeId: "route_23", boardingStopId: "stop_A", destinationStopId: "stop_gomtinagar" },
      "user_anon_1",
    );
    const res2 = await createTripShareHandler(
      { routeId: "route_23", boardingStopId: "stop_A", destinationStopId: "stop_gomtinagar" },
      "user_anon_1",
    );

    expect(res1.token).not.toBe(res2.token);
  });

  it("rejects unauthenticated requests", async () => {
    await expect(
      createTripShareHandler(
        { routeId: "route_23", boardingStopId: "stop_A", destinationStopId: "stop_gomtinagar" },
        undefined, // unauthenticated
      ),
    ).rejects.toThrow(/Authentication required/i);
  });

  it("enforces rate limits per hour (10 trips/hr) (M5-21)", async () => {
    const uid = "user_rate_limit_test";
    const payload = {
      routeId: "route_23",
      boardingStopId: "stop_A",
      destinationStopId: "stop_gomtinagar",
    };

    // First 10 should succeed
    for (let i = 0; i < 10; i++) {
      await createTripShareHandler(payload, uid);
    }

    // 11th should throw resource-exhausted
    await expect(createTripShareHandler(payload, uid)).rejects.toThrow(/Rate limit exceeded/i);
  });

  it("allows owner to end trip and invalidates non-owners (M5-20)", async () => {
    const t0 = 10000000;
    const store = new Map<string, StoredTripDoc>();

    // 1. Create trip
    const created = await createTripShareHandler(
      { routeId: "route_23", boardingStopId: "stop_A", destinationStopId: "stop_gomtinagar" },
      "owner_uid_123",
      t0,
      async (tok, doc) => {
        store.set(tok, doc as unknown as StoredTripDoc);
      },
    );

    // 2. Owner ends trip successfully
    let updatedTrip: Partial<StoredTripDoc> | null = null;
    const endRes = await endTripHandler(
      {
        token: created.token,
        ownerSecret: created.ownerSecret,
        outcome: "COMPLETED",
      },
      "owner_uid_123",
      async (tok) => store.get(tok) ?? null,
      async (_tok, updates) => {
        updatedTrip = updates;
      },
      t0 + 50000,
    );

    expect(endRes.success).toBe(true);
    expect(endRes.state).toBe("COMPLETED");
    expect((updatedTrip as StoredTripDoc | null)?.expiresAt).toBe(t0 + 50000); // Immediate expiration for privacy

    // 3. Non-owner (different secret) is rejected
    await expect(
      endTripHandler(
        {
          token: created.token,
          ownerSecret: "wrong_secret_123456789012",
          outcome: "CANCELLED",
        },
        "attacker_uid",
        async (tok) => store.get(tok) ?? null,
        async () => {},
      ),
    ).rejects.toThrow(/Unauthorized/i);
  });
});

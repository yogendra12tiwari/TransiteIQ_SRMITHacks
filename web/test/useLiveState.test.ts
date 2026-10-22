import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiveState } from "../src/hooks/useLiveState";
import * as firestore from "firebase/firestore";

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof firestore>("firebase/firestore");
  return {
    ...actual,
    doc: vi.fn(),
    onSnapshot: vi.fn(),
  };
});

describe("useLiveState hook (M2-24)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("subscribes to sim/live doc and returns parsed live state", () => {
    let snapshotCallback: (snap: unknown) => void = () => {};

    vi.mocked(firestore.onSnapshot).mockImplementation((((...args: unknown[]) => {
      snapshotCallback = args[1] as (snap: unknown) => void;
      return vi.fn();
    }) as unknown) as typeof firestore.onSnapshot);

    const { result } = renderHook(() => useLiveState());
    expect(result.current.loading).toBe(true);

    const mockLiveSnapshot = {
      exists: () => true,
      data: () => ({
        simTimeMs: 1700000000000,
        hour: 20,
        buses: [
          {
            id: "bus_23_1",
            routeId: "route_23",
            distanceAlongRouteM: 300,
            speedMps: 8.0,
            lat: 26.85,
            lng: 80.94,
            status: "RUNNING",
          },
        ],
        etas: [],
        alerts: [],
        tick: 5,
        scenario: "live",
      }),
    };

    act(() => {
      snapshotCallback(mockLiveSnapshot);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.isStale).toBe(false);
    expect(result.current.data?.buses.length).toBe(1);
    expect(result.current.data?.buses[0]?.id).toBe("bus_23_1");
  });

  it("marks state stale when no updates arrive for > 8 seconds", () => {
    let snapshotCallback: (snap: unknown) => void = () => {};

    vi.mocked(firestore.onSnapshot).mockImplementation((((...args: unknown[]) => {
      snapshotCallback = args[1] as (snap: unknown) => void;
      return vi.fn();
    }) as unknown) as typeof firestore.onSnapshot);

    const { result } = renderHook(() => useLiveState());

    act(() => {
      snapshotCallback({
        exists: () => true,
        data: () => ({
          simTimeMs: Date.now(),
          hour: 20,
          buses: [],
          etas: [],
          alerts: [],
          tick: 1,
          scenario: "live",
        }),
      });
    });

    expect(result.current.isStale).toBe(false);

    // Fast-forward 9 seconds
    act(() => {
      vi.advanceTimersByTime(9000);
    });

    expect(result.current.isStale).toBe(true);
  });
});

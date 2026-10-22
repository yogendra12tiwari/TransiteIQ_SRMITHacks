import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SafeWaitToast } from "../src/components/SafeWaitToast";
import { SafeSpotsList } from "../src/components/SafeSpotsList";
import type { NearbySafeSpot, SafeWaitDecision } from "@transitiq/shared";

describe("SafeWaitToast (M5-16, M5-18)", () => {
  it("renders primary safe wait message and handles acknowledge/snooze", () => {
    const onAck = vi.fn();
    const onSnooze = vi.fn();
    const onDismiss = vi.fn();

    const decision: SafeWaitDecision = {
      action: "fire_primary",
      message: "Bus 23 is ~5 min away. Leave now (6 min walk).",
      urgency: "normal",
    };

    render(
      <SafeWaitToast decision={decision} onAcknowledge={onAck} onSnooze={onSnooze} onDismiss={onDismiss} />,
    );

    expect(screen.getByTestId("safe-wait-toast")).toBeInTheDocument();
    expect(screen.getByText("Bus 23 is ~5 min away. Leave now (6 min walk).")).toBeInTheDocument();

    const ackBtn = screen.getByTestId("toast-ack-btn");
    fireEvent.click(ackBtn);
    expect(onAck).toHaveBeenCalled();

    const snoozeBtn = screen.getByTestId("toast-snooze-btn");
    fireEvent.click(snoozeBtn);
    expect(onSnooze).toHaveBeenCalled();
  });

  it("renders urgent styling for escalation alerts", () => {
    const decision: SafeWaitDecision = {
      action: "fire_escalation",
      message: "Bus is arriving sooner than expected — leave now.",
      urgency: "urgent",
    };

    render(
      <SafeWaitToast decision={decision} onAcknowledge={() => {}} onSnooze={() => {}} onDismiss={() => {}} />,
    );

    expect(screen.getByText("Bus is arriving sooner than expected — leave now.")).toBeInTheDocument();
    expect(screen.getByText(/Urgent:/i)).toBeInTheDocument();
  });
});

describe("SafeSpotsList (M5-11, M5-12)", () => {
  const dummySpots: NearbySafeSpot[] = [
    {
      id: "spot_1",
      name: "Apollo 24/7 Pharmacy",
      kind: "pharmacy",
      lat: 26.852,
      lng: 80.966,
      openLate: true,
      distanceM: 120,
    },
    {
      id: "spot_2",
      name: "City Bank ATM Kiosk",
      kind: "other",
      lat: 26.853,
      lng: 80.967,
      openLate: false,
      distanceM: 210,
    },
  ];

  it("renders list of safe waiting spots with distance and open late tags", () => {
    render(<SafeSpotsList safeSpots={dummySpots} stopName="Stop A" />);

    expect(screen.getByTestId("safe-spots-list")).toBeInTheDocument();
    expect(screen.getByText("Apollo 24/7 Pharmacy")).toBeInTheDocument();
    expect(screen.getByText(/120m away/i)).toBeInTheDocument();
    expect(screen.getByText("Open Late")).toBeInTheDocument();
  });

  it("renders fallback message when no spots are found", () => {
    render(<SafeSpotsList safeSpots={[]} stopName="Stop A" />);
    expect(screen.getByText(/No verified safe spots/i)).toBeInTheDocument();
  });
});

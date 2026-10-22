import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequireOperator } from "../src/components/RequireOperator";
import { DemoPage } from "../src/pages/Demo";
import * as useOperatorModule from "../src/hooks/useOperator";
import * as useNetworkModule from "../src/hooks/useNetwork";

describe("Demo Controller & RequireOperator Guard (M2-17 to M2-22)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("M2-15: blocks unauthenticated / non-operator access with access required message", () => {
    vi.spyOn(useOperatorModule, "useOperator").mockReturnValue({
      user: null,
      isOperator: false,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOutOperator: vi.fn(),
    });

    render(
      <RequireOperator>
        <DemoPage />
      </RequireOperator>,
    );

    expect(screen.getByText(/Operator Access Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in with Google/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Simulation Controller/i })).not.toBeInTheDocument();
  });

  it("M2-15 & M2-17: renders controller controls when user has operator claim", () => {
    vi.spyOn(useOperatorModule, "useOperator").mockReturnValue({
      user: { email: "operator@transitiq.demo" } as never,
      isOperator: true,
      loading: false,
      signInWithGoogle: vi.fn(),
      signOutOperator: vi.fn(),
    });

    vi.spyOn(useNetworkModule, "useNetwork").mockReturnValue({
      routes: [
        {
          id: "route_23",
          name: "Bus 23",
          color: "#e11d48",
          stopIds: ["stop_1", "stop_2"],
          polyline: [
            [26.84, 80.94],
            [26.85, 80.95],
          ],
          headwayMin: { peak: 10, offpeak: 15, evening: 25 },
        },
      ],
      stops: [
        {
          id: "stop_1",
          name: "Stop 1",
          lat: 26.84,
          lng: 80.94,
          activity: 0.5,
          lighting: "good",
          ridershipPerEvening: 200,
          skipRate: 0.1,
          safeSpotIds: [],
        },
      ],
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <RequireOperator>
          <DemoPage />
        </RequireOperator>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Simulation Controller/i)).toBeInTheDocument();
    expect(screen.getByTestId("sim-toggle-btn")).toBeInTheDocument();
    expect(screen.getByTestId("auto-stop-countdown")).toHaveTextContent("10:00");
    expect(screen.getByTestId("session-write-counter")).toHaveTextContent("0");
    expect(screen.getByTestId("time-slider")).toBeInTheDocument();
  });
});

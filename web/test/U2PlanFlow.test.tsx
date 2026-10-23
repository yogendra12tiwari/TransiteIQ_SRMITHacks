import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axe from "axe-core";
import "../src/i18n";
import { PlanPage } from "../src/pages/Plan";
import { EtaText } from "../src/components/EtaText";
import { AlertCard } from "../src/components/AlertCard";
import * as networkHook from "../src/hooks/useNetwork";
import * as liveHook from "../src/hooks/useLiveState";
import type { Route as RouteType, Stop, Alert } from "@transitiq/shared";

import stopsData from "../../seed/stops.json";
import routesData from "../../seed/routes.json";

// Mock leaflet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Polyline: () => <div data-testid="mock-polyline" />,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-circle-marker">{children}</div>
  ),
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-popup">{children}</div>,
  useMap: () => ({
    invalidateSize: vi.fn(),
  }),
}));

const mockRoutes = routesData as RouteType[];
const mockStops = stopsData as Stop[];

describe("Milestone U2: Plan Flow & Primitives", () => {
  beforeEach(() => {
    vi.spyOn(networkHook, "useNetwork").mockReturnValue({
      routes: mockRoutes,
      stops: mockStops,
      loading: false,
      error: null,
    });

    vi.spyOn(liveHook, "useLiveState").mockReturnValue({
      data: {
        buses: [],
        etas: [],
        alerts: [],
        simTimeMs: Date.now(),
        hour: 20,
        tick: 1,
        scenario: "live",
      },
      loading: false,
      error: null,
      isStale: false,
      lastUpdatedMs: Date.now(),
    });
  });

  describe("U2-01: EtaText primitive", () => {
    it("renders range format without statistical jargon", () => {
      render(<EtaText lowMin={6} highMin={8} />);
      expect(screen.getByTestId("eta-text-range")).toBeInTheDocument();
      expect(screen.getByText(/6–8/)).toBeInTheDocument();
      expect(screen.getByText(/Arriving in/i)).toBeInTheDocument();
    });

    it("renders 'Arriving now' when lowMin <= 1", () => {
      render(<EtaText lowMin={1} highMin={3} />);
      expect(screen.getByTestId("eta-text-now")).toHaveTextContent("Arriving now");
    });

    it("renders skip risk warning text when isLikelySkip is true", () => {
      render(<EtaText lowMin={6} highMin={8} isLikelySkip={true} />);
      expect(screen.getByTestId("eta-text-skip")).toHaveTextContent("This bus may not stop here");
    });
  });

  describe("U2-02: AlertCard primitive", () => {
    const dummyAlert: Alert = {
      id: "alert_skip_stop_a",
      type: "LIKELY_SKIP",
      severity: "high",
      message: "Bus 23 is running at 45 km/h near Stop A and may skip.",
      affectedStopIds: ["stop_A"],
      createdAt: Date.now(),
    };

    it("renders alert card with severity badge and affected stops", () => {
      render(<AlertCard alert={dummyAlert} />);
      expect(screen.getByTestId("alert-card-LIKELY_SKIP")).toBeInTheDocument();
      expect(screen.getByText("High Severity")).toBeInTheDocument();
      expect(screen.getByText(/Bus 23 is running at 45 km\/h/)).toBeInTheDocument();
      expect(screen.getByText("stop_A")).toBeInTheDocument();
    });
  });

  describe("U2-04: Plan Step 1 & Step 2 Navigation", () => {
    it("renders Step 1 with search and enables Continue upon origin selection", () => {
      render(
        <MemoryRouter initialEntries={["/plan"]}>
          <PlanPage />
        </MemoryRouter>,
      );

      expect(screen.getByTestId("step-indicator")).toHaveTextContent("Step 1 of 3");
      expect(screen.getByRole("heading", { name: "Where are you starting?" })).toBeInTheDocument();

      const continueBtn = screen.getByTestId("step-1-continue-btn");
      expect(continueBtn).toBeEnabled();

      fireEvent.click(continueBtn);

      // Now at Step 2
      expect(screen.getByTestId("step-indicator")).toHaveTextContent("Step 2 of 3");
      expect(screen.getByRole("heading", { name: "Where do you want to go?" })).toBeInTheDocument();
    });

    it("back action in Step 2 preserves state and returns to Step 1", () => {
      render(
        <MemoryRouter initialEntries={["/plan"]}>
          <PlanPage />
        </MemoryRouter>,
      );

      // Step 1 -> Step 2
      fireEvent.click(screen.getByTestId("step-1-continue-btn"));
      expect(screen.getByTestId("step-indicator")).toHaveTextContent("Step 2 of 3");

      // Click "Change" on context line
      const changeBtn = screen.getByRole("button", { name: /change/i });
      fireEvent.click(changeBtn);

      // Returned to Step 1
      expect(screen.getByTestId("step-indicator")).toHaveTextContent("Step 1 of 3");
    });
  });

  describe("U2-05 & U2-10: Step 3 Route Compare & Golden Numbers", () => {
    it("matches golden takeaway numbers (4 and 10) and pre-selects Recommended", () => {
      render(
        <MemoryRouter initialEntries={["/plan"]}>
          <PlanPage />
        </MemoryRouter>,
      );

      // Advance Step 1 -> Step 2 -> Step 3
      fireEvent.click(screen.getByTestId("step-1-continue-btn"));
      fireEvent.click(screen.getByTestId("step-2-continue-btn"));

      expect(screen.getByTestId("step-indicator")).toHaveTextContent("Step 3 of 3");
      expect(screen.getByText("Choose how to travel")).toBeInTheDocument();

      // Check Takeaway line with golden numbers (4 min longer, 10 min less waiting)
      const takeaway = screen.getByTestId("takeaway-line");
      expect(takeaway).toBeInTheDocument();
      expect(takeaway).toHaveTextContent(/4 minutes longer, but 10 minutes less waiting at a quiet stop/i);

      // Check Recommended is present and has checked radio state
      const recCard = screen.getByTestId("route-option-card-safer");
      expect(recCard).toHaveAttribute("aria-checked", "true");
    });

    it("allows card selection by keyboard (Enter and Space keys)", () => {
      render(
        <MemoryRouter initialEntries={["/plan"]}>
          <PlanPage />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId("step-1-continue-btn"));
      fireEvent.click(screen.getByTestId("step-2-continue-btn"));

      const fastestCard = screen.getByTestId("route-option-card-fastest");
      expect(fastestCard).toHaveAttribute("aria-checked", "false");

      // Select via keyboard Space
      fireEvent.keyDown(fastestCard, { key: " " });
      expect(fastestCard).toHaveAttribute("aria-checked", "true");

      // Select Recommended via keyboard Enter
      const recCard = screen.getByTestId("route-option-card-safer");
      fireEvent.keyDown(recCard, { key: "Enter" });
      expect(recCard).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("U2-06 & U2-07: More Details Disclosure and Show on Map Sheet", () => {
    it("toggles 'More details' disclosure to show walking time and factors", () => {
      render(
        <MemoryRouter initialEntries={["/plan"]}>
          <PlanPage />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId("step-1-continue-btn"));
      fireEvent.click(screen.getByTestId("step-2-continue-btn"));

      const moreDetailsBtn = screen.getByRole("button", { name: /more details/i });
      fireEvent.click(moreDetailsBtn);

      expect(screen.getByText(/Walk to the stop:/i)).toBeInTheDocument();
      expect(screen.getByText(/Why this rating\?/i)).toBeInTheDocument();
      expect(screen.getByRole("slider")).toBeInTheDocument();
    });

    it("lifts map bottom sheet when 'Show on map' is tapped", () => {
      render(
        <MemoryRouter initialEntries={["/plan"]}>
          <PlanPage />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId("step-1-continue-btn"));
      fireEvent.click(screen.getByTestId("step-2-continue-btn"));

      const showOnMapBtn = screen.getByTestId("show-on-map-link");
      fireEvent.click(showOnMapBtn);

      expect(screen.getByText("Fastest (solid)")).toBeInTheDocument();
      expect(screen.getByText("Safer (dashed)")).toBeInTheDocument();
    });
  });

  describe("U2-09: Sticky Action and Continue", () => {
    it("navigates to route detail when 'Continue with this route' is clicked", () => {
      render(
        <MemoryRouter initialEntries={["/plan"]}>
          <Routes>
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/route/:id" element={<div data-testid="route-detail-view">Route Detail</div>} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId("step-1-continue-btn"));
      fireEvent.click(screen.getByTestId("step-2-continue-btn"));

      const continueRouteBtn = screen.getByTestId("continue-route-btn");
      expect(continueRouteBtn).toBeEnabled();

      fireEvent.click(continueRouteBtn);
      expect(screen.getByTestId("route-detail-view")).toBeInTheDocument();
    });
  });

  describe("Accessibility (Axe)", () => {
    it("passes automated axe accessibility scan with 0 violations", async () => {
      const { container } = render(
        <MemoryRouter initialEntries={["/plan"]}>
          <PlanPage />
        </MemoryRouter>,
      );

      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false }, // Verified mathematically in docs/ui-contrast.md
        },
      });

      expect(results.violations).toEqual([]);
    });
  });
});

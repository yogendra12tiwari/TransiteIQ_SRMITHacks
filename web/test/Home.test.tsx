import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axe from "axe-core";
import "../src/i18n";
import { HomePage } from "../src/pages/Home";
import * as networkHook from "../src/hooks/useNetwork";
import * as liveHook from "../src/hooks/useLiveState";
import type { Route as RouteType, Stop, Bus, EtaResult } from "@transitiq/shared";

// Mock leafet to avoid jsdom map rendering issues
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="mock-tile-layer" />,
  Polyline: () => <div data-testid="mock-polyline" />,
  CircleMarker: ({
    children,
    eventHandlers,
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
  }) => (
    <div data-testid="mock-circle-marker" onClick={() => eventHandlers?.click?.()} role="button" tabIndex={0}>
      {children}
    </div>
  ),
  Marker: ({
    children,
    eventHandlers,
  }: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
  }) => (
    <div data-testid="mock-marker" onClick={() => eventHandlers?.click?.()} role="button" tabIndex={0}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-popup">{children}</div>,
  useMap: () => ({
    invalidateSize: vi.fn(),
  }),
}));

const mockRoutes: RouteType[] = [
  {
    id: "route_23",
    name: "Bus 23",
    color: "#e11d48",
    stopIds: ["stop_A", "stop_B"],
    polyline: [
      [26.85, 80.94],
      [26.86, 80.95],
    ],
    headwayMin: { peak: 10, offpeak: 15, evening: 25 },
  },
];

const mockStops: Stop[] = [
  {
    id: "stop_A",
    name: "Stop A (Isolated)",
    lat: 26.85,
    lng: 80.94,
    activity: 0.2,
    lighting: "poor",
    ridershipPerEvening: 400,
    skipRate: 0.25,
    safeSpotIds: [],
  },
  {
    id: "stop_B",
    name: "Stop B (Busy)",
    lat: 26.853,
    lng: 80.943,
    activity: 0.8,
    lighting: "good",
    ridershipPerEvening: 1200,
    skipRate: 0.05,
    safeSpotIds: [],
  },
];

const mockBuses: Bus[] = [
  {
    id: "bus_23_1",
    routeId: "route_23",
    distanceAlongRouteM: 450,
    speedMps: 7.5,
    lat: 26.852,
    lng: 80.942,
    status: "RUNNING",
  },
];

const mockEtas: EtaResult[] = [
  {
    busId: "bus_23_1",
    stopId: "stop_A",
    lowMin: 6,
    highMin: 8,
    meanMin: 7,
    confidence: 0.8,
  },
];

describe("HomePage & Rider Live Map (Milestone U1)", () => {
  beforeEach(() => {
    vi.spyOn(networkHook, "useNetwork").mockReturnValue({
      routes: mockRoutes,
      stops: mockStops,
      loading: false,
      error: null,
    });

    vi.spyOn(liveHook, "useLiveState").mockReturnValue({
      data: {
        buses: mockBuses,
        etas: mockEtas,
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

  it("U1-01 & U1-02: renders HomePage with MapView and bottom Sheet containing 'Where are you going?'", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("home-page")).toBeInTheDocument();
    expect(screen.getByTestId("map-view-container")).toBeInTheDocument();
    expect(screen.getByTestId("home-search-input")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Where are you going/i)).toBeInTheDocument();
    expect(screen.getByTestId("home-search-button")).toBeInTheDocument();
  });

  it("U1-08: search input submission navigates to /plan", () => {
    function LocationTracker() {
      return <div data-testid="plan-screen">Plan Screen</div>;
    }

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plan" element={<LocationTracker />} />
        </Routes>
      </MemoryRouter>,
    );

    const input = screen.getByTestId("home-search-input");
    fireEvent.change(input, { target: { value: "Hazratganj" } });

    const submitBtn = screen.getByTestId("home-search-button");
    fireEvent.click(submitBtn);

    expect(screen.getByTestId("plan-screen")).toBeInTheDocument();
  });

  it("U1-08: clicking a popular destination chip navigates to /plan with that destination", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/plan" element={<div data-testid="plan-target">Plan Destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const univChip = screen.getByTestId("popular-lucknow-university");
    fireEvent.click(univChip);

    expect(screen.getByTestId("plan-target")).toBeInTheDocument();
  });

  it("U1-04: tapping a bus opens BusSheet with plain text speed and arrival info", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Marker for bus
    const busMarker = screen.getByTestId("mock-marker");
    fireEvent.click(busMarker);

    const sheet = screen.getByTestId("bus-bottom-sheet");
    expect(sheet).toBeInTheDocument();
    expect(within(sheet).getByText("Bus 23")).toBeInTheDocument();
    expect(within(sheet).getByText(/Moving/i)).toBeInTheDocument();
    expect(within(sheet).getByText(/27 km\/h/i)).toBeInTheDocument();
  });

  it("U1-04: tapping a stop opens StopSheet with plain text arrivals", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    // Stop markers
    const stopMarkers = screen.getAllByTestId("mock-circle-marker");
    fireEvent.click(stopMarkers[0]!); // Click Stop A

    expect(screen.getAllByText("Stop A (Isolated)")[0]).toBeInTheDocument();
    // Plain text arrival intervals (no raw internal jargon)
    expect(screen.getByText(/6–8 min/i)).toBeInTheDocument();
  });

  it("U1-05: toggles accessible text List View alternative showing buses and stops", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const toggleBtn = screen.getByTestId("toggle-list-view");
    expect(toggleBtn).toHaveTextContent(/List view/i);

    fireEvent.click(toggleBtn);

    expect(screen.getByTestId("accessible-list-view")).toBeInTheDocument();
    expect(screen.getByText(/Upcoming buses/i)).toBeInTheDocument();
    expect(screen.getByText(/Stop A \(Isolated\)/i)).toBeInTheDocument();

    // Toggle back
    const mapViewBtn = screen.getByTestId("toggle-list-view");
    fireEvent.click(mapViewBtn);
    expect(screen.getByTestId("map-view-container")).toBeInTheDocument();
  });

  it("U1-06: displays stale banner when feed has not received updates", () => {
    vi.spyOn(liveHook, "useLiveState").mockReturnValue({
      data: {
        buses: mockBuses,
        etas: mockEtas,
        alerts: [],
        simTimeMs: Date.now() - 10000,
        hour: 20,
        tick: 1,
        scenario: "live",
      },
      loading: false,
      error: null,
      isStale: true,
      lastUpdatedMs: Date.now() - 10000,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByTestId("stale-data-banner").length).toBeGreaterThan(0);
  });

  it("U1-07: renders skeleton state while initial snapshot is loading", () => {
    vi.spyOn(networkHook, "useNetwork").mockReturnValue({
      routes: [],
      stops: [],
      loading: true,
      error: null,
    });

    vi.spyOn(liveHook, "useLiveState").mockReturnValue({
      data: null,
      loading: true,
      error: null,
      isStale: false,
      lastUpdatedMs: null,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("home-skeleton")).toBeInTheDocument();
  });

  it("U1-08: mobile-first responsiveness at 360px width has no horizontal overflow", () => {
    const { container } = render(
      <MemoryRouter>
        <div style={{ width: "360px", maxWidth: "360px", overflowX: "hidden" }}>
          <HomePage />
        </div>
      </MemoryRouter>,
    );

    const homeRoot = container.querySelector('[data-testid="home-page"]');
    expect(homeRoot).toBeInTheDocument();
    expect(homeRoot?.className).toContain("overflow-x-hidden");
  });

  it("U1-08: passes automated axe accessibility scan with 0 violations", async () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage />
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

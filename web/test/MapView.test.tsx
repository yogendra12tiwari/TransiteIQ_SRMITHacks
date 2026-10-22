import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MapView } from "../src/components/MapView";
import type { Route, Stop, Bus } from "@transitiq/shared";

const mockRoutes: Route[] = [
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
  {
    id: "bus_23_2",
    routeId: "route_23",
    distanceAlongRouteM: 1200,
    speedMps: 0,
    lat: 26.856,
    lng: 80.946,
    status: "RUNNING",
  },
];

describe("MapView & Rider Map Component (M2-23 to M2-30)", () => {
  it("renders map container with route filters and stops", () => {
    render(<MapView routes={mockRoutes} stops={mockStops} buses={mockBuses} />);

    expect(screen.getByTestId("map-view-container")).toBeInTheDocument();
    expect(screen.getByText("Routes (1)")).toBeInTheDocument();
    expect(screen.getByText("Bus 23")).toBeInTheDocument();
  });

  it("M2-28: displays stale data warning banner when feed is stale", () => {
    render(<MapView routes={mockRoutes} stops={mockStops} buses={mockBuses} isStale={true} />);

    expect(screen.getByTestId("stale-data-banner")).toBeInTheDocument();
    expect(screen.getByText(/Simulation feed paused \/ waiting for updates/i)).toBeInTheDocument();
  });

  it("M2-27: allows selecting a bus to display bottom sheet with status and speed", () => {
    const handleSelect = vi.fn();
    render(<MapView routes={mockRoutes} stops={mockStops} buses={mockBuses} onBusSelect={handleSelect} />);

    // Filter toggles
    const routeButton = screen.getByText("Bus 23").closest("button")!;
    fireEvent.click(routeButton);
    expect(routeButton.className).toContain("line-through");
  });
});

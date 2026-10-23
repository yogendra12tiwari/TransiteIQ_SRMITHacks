import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelpPage } from "../src/pages/Help";
import { StopTimetablePage } from "../src/pages/StopTimetable";
import { DriverPage } from "../src/pages/Driver";
import { SafetyHeatmap } from "../src/components/SafetyHeatmap";
import { FleetMonitoring } from "../src/components/FleetMonitoring";
import { IncidentManagement } from "../src/components/IncidentManagement";
import { TrendsAnalytics } from "../src/components/TrendsAnalytics";

// Mock network and live data
vi.mock("../src/hooks/useNetwork", () => ({
  useNetwork: () => ({
    routes: [
      {
        id: "route_23",
        name: "Route 23 (Hazratganj – Gomti Nagar)",
        color: "#E11D48",
        stopIds: ["stop_A", "stop_B", "stop_gomtinagar"],
        polyline: [
          [26.85, 80.95],
          [26.86, 80.96],
        ],
        headwayMin: { peak: 8, offpeak: 12, evening: 18 },
        fare: { baseInr: 10, perKmInr: 2, minInr: 10 },
      },
    ],
    stops: [
      {
        id: "stop_A",
        name: "Stop A (Hazratganj)",
        lat: 26.8528,
        lng: 80.9655,
        activity: 0.2,
        lighting: "poor",
        cctv: false,
        ridershipPerEvening: 400,
        skipRate: 0.25,
        safeSpotIds: ["spot_1"],
      },
      {
        id: "stop_B",
        name: "Stop B (Market Junction)",
        lat: 26.8545,
        lng: 80.9685,
        activity: 0.8,
        lighting: "good",
        cctv: true,
        ridershipPerEvening: 420,
        skipRate: 0.05,
        safeSpotIds: ["spot_2"],
      },
    ],
    safeSpots: [
      {
        id: "spot_1",
        name: "24/7 Pharmacy",
        kind: "pharmacy",
        lat: 26.853,
        lng: 80.966,
        openLate: true,
      },
    ],
    loading: false,
  }),
}));

vi.mock("../src/hooks/useLiveState", () => ({
  useLiveState: () => ({
    data: {
      buses: [
        {
          id: "bus_route_23_1",
          routeId: "route_23",
          distanceAlongRouteM: 1000,
          speedMps: 7.5,
          lat: 26.852,
          lng: 80.965,
          status: "RUNNING",
          driverStatus: "RUNNING",
          occupancy: 0.45,
        },
      ],
      etas: [
        {
          busId: "bus_route_23_1",
          stopId: "stop_A",
          meanMin: 14,
          lowMin: 12,
          highMin: 16,
          confidence: 0.8,
        },
      ],
      alerts: [],
      hour: 20,
      tick: 42,
    },
    isStale: false,
    loading: false,
  }),
}));

vi.mock("../src/hooks/useOperator", () => ({
  useOperator: () => ({
    user: { uid: "test_op_uid", email: "operator@transitiq.test" },
    isOperator: true,
    loading: false,
    signOutOperator: vi.fn(),
  }),
}));

describe("Milestone M6b: UI Surfaces & Components", () => {
  describe("HelpPage (/help) (F25 / P2-23 / D11)", () => {
    it("renders Emergency Help with Call 112 primary button and help points", () => {
      render(
        <MemoryRouter initialEntries={["/help"]}>
          <HelpPage />
        </MemoryRouter>,
      );

      // Asserts Call 112 button is rendered
      expect(screen.getByText(/112/i)).toBeInTheDocument();
      expect(screen.getByText(/1091/i)).toBeInTheDocument();

      // Asserts Lucknow help points are rendered
      expect(screen.getByText(/Hazratganj Women Police Station/i)).toBeInTheDocument();
      expect(screen.getByText(/Dr. RML Institute of Medical Sciences/i)).toBeInTheDocument();
    });
  });

  describe("StopTimetablePage (/stop/:id) (F13 / P2-05)", () => {
    it("renders timetable for stop with arrivals, CCTV badge, and safe spots", () => {
      render(
        <MemoryRouter initialEntries={["/stop/stop_B"]}>
          <Routes>
            <Route path="/stop/:id" element={<StopTimetablePage />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText(/Stop B \(Market Junction\)/i)).toBeInTheDocument();
      // CCTV indicator
      expect(screen.getByText(/Camera nearby/i)).toBeInTheDocument();
      // Next Arrivals
      expect(screen.getByText(/Next Arrivals & Schedule/i)).toBeInTheDocument();
      // Route 23 schedule
      expect(screen.getByText(/Route 23/i)).toBeInTheDocument();
    });
  });

  describe("DriverPage (/driver) (F32 / P2-24 / D9)", () => {
    it("renders bus selection, status buttons, and GPS controls", () => {
      render(
        <MemoryRouter initialEntries={["/driver"]}>
          <DriverPage />
        </MemoryRouter>,
      );

      expect(screen.getByText(/Driver \/ Bus Panel/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Running/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Stalled/i)).toBeInTheDocument();
      expect(screen.getByText(/GPS Telemetry Override/i)).toBeInTheDocument();
    });
  });

  describe("SafetyHeatmap (F26 / D10)", () => {
    it("renders heatmap zones with priority scores and anti-stigma notice", () => {
      const stops = [
        {
          id: "stop_A",
          name: "Stop A",
          lat: 26.85,
          lng: 80.96,
          riskScore: 0.795,
          safetyReportsCount: 7,
          ridershipPerEvening: 400,
          priorityScore: 318,
        },
      ];

      render(<SafetyHeatmap stops={stops} />);
      expect(screen.getByText(/Authority Safety Incident Heatmap/i)).toBeInTheDocument();
      expect(screen.getByText(/Anti-Stigma Policy/i)).toBeInTheDocument();
    });
  });

  describe("FleetMonitoring (F27, F30)", () => {
    it("renders fleet telemetry table and alert publishing form", () => {
      render(
        <FleetMonitoring
          buses={[
            {
              id: "bus_1",
              routeId: "route_23",
              distanceAlongRouteM: 500,
              speedMps: 8,
              lat: 26.85,
              lng: 80.96,
              status: "RUNNING",
              driverStatus: "RUNNING",
              occupancy: 0.4,
            },
          ]}
          routes={[
            {
              id: "route_23",
              name: "Route 23",
              color: "#E11D48",
              stopIds: ["stop_A"],
              polyline: [
                [26.85, 80.96],
                [26.86, 80.97],
              ],
              headwayMin: { peak: 10, offpeak: 15, evening: 20 },
              fare: { baseInr: 10, perKmInr: 2, minInr: 10 },
            },
          ]}
          stops={[]}
        />,
      );

      expect(screen.getByText(/Live Fleet Telemetry/i)).toBeInTheDocument();
      expect(screen.getByText(/Publish Service Alert/i)).toBeInTheDocument();
    });
  });

  describe("IncidentManagement (F29)", () => {
    it("renders unified incident list with status filters", () => {
      render(<IncidentManagement />);
      expect(screen.getByText(/Unified Incident & Signal Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Incident Resolution & Notes/i)).toBeInTheDocument();
    });
  });

  describe("TrendsAnalytics (F28, F31 / D12)", () => {
    it("renders RouteScore cards and CSV export button", () => {
      render(
        <TrendsAnalytics
          routes={[
            {
              id: "route_23",
              name: "Route 23",
              color: "#E11D48",
              stopIds: ["stop_A"],
              polyline: [
                [26.85, 80.96],
                [26.86, 80.97],
              ],
              headwayMin: { peak: 10, offpeak: 15, evening: 20 },
              fare: { baseInr: 10, perKmInr: 2, minInr: 10 },
            },
          ]}
        />,
      );

      expect(screen.getByText(/Route Performance & Safety Trends/i)).toBeInTheDocument();
      expect(screen.getByText(/Export Aggregate CSV/i)).toBeInTheDocument();
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RiskBadge } from "../src/components/RiskBadge";
import { StopSheet } from "../src/components/StopSheet";
import { AlertsPage } from "../src/pages/Alerts";
import type { Stop, EtaResult, Alert } from "@transitiq/shared";
import { formatEtaRange } from "@transitiq/shared";

// Mock useLiveState hook for AlertsPage test
const mockUseLiveState = vi.fn();
vi.mock("../src/hooks/useLiveState", () => ({
  useLiveState: () => mockUseLiveState(),
}));

const mockStop: Stop = {
  id: "stop_A",
  name: "Charbagh Terminal",
  lat: 26.85,
  lng: 80.95,
  activity: 0.2,
  lighting: "poor",
  ridershipPerEvening: 400,
  skipRate: 0.25,
  safeSpotIds: [],
};

const mockEtas: EtaResult[] = [
  {
    busId: "bus_23_1",
    stopId: "stop_A",
    meanMin: 7.0,
    lowMin: 6.0,
    highMin: 8.0,
    confidence: 0.8,
  },
];

describe("M3 UI Components (M3-28 to M3-33)", () => {
  it("formatEtaRange formats range and single values correctly (M3-31)", () => {
    expect(formatEtaRange(6.1, 7.9)).toBe("6–8 min");
    expect(formatEtaRange(5.0, 5.0)).toBe("5 min");
    expect(formatEtaRange(0, 2)).toBe("0–2 min");
  });

  it("RiskBadge maps colours and labels with accessible roles (M3-30, M3-31)", () => {
    const { rerender } = render(<RiskBadge label="Low" score={0.25} />);
    const lowBadge = screen.getByRole("status");
    expect(lowBadge.textContent).toContain("Low Risk");
    expect(lowBadge.textContent).toContain("0.25");
    expect(lowBadge.className).toContain("text-emerald-400");

    rerender(<RiskBadge label="Medium" score={0.5} />);
    const medBadge = screen.getByRole("status");
    expect(medBadge.textContent).toContain("Medium Risk");
    expect(medBadge.className).toContain("text-amber-400");

    rerender(<RiskBadge label="High" score={0.79} />);
    const highBadge = screen.getByRole("status");
    expect(highBadge.textContent).toContain("High Risk");
    expect(highBadge.className).toContain("text-rose-400");
  });

  it("StopSheet displays next buses and expands Why drawer with all 5 factors (M3-29, M3-31)", () => {
    const onClose = vi.fn();
    render(<StopSheet stop={mockStop} onClose={onClose} etas={mockEtas} hour={20} recentReports={7} />);

    // Stop info & ETA range
    expect(screen.getByText("Charbagh Terminal")).toBeDefined();
    expect(screen.getByText("6–8 min")).toBeDefined();

    // Click "Why?" button to expand drawer
    const whyButton = screen.getByText("Why?").closest("button")!;
    fireEvent.click(whyButton);

    // Assert drawer content
    const drawer = screen.getByTestId("why-drawer-content");
    expect(drawer).toBeDefined();

    // Check all 5 factors are present in the drawer
    expect(drawer.textContent).toContain("Wait Time");
    expect(drawer.textContent).toContain("Night / Hour");
    expect(drawer.textContent).toContain("Low Activity");
    expect(drawer.textContent).toContain("Safety Reports");
    expect(drawer.textContent).toContain("Unreliability");
  });

  it("AlertsPage renders alerts and toggles language between EN and HI (M3-28)", () => {
    const mockAlert: Alert = {
      id: "alert_test_1",
      type: "LIKELY_SKIP",
      severity: "high",
      message: "Bus 23 is likely to skip Stop A due to corridor congestion.",
      messageHi: "कॉरिडोर में भीड़ के कारण बस 23 स्टॉप ए को छोड़ सकती है।",
      affectedStopIds: ["stop_A"],
      createdAt: Date.now(),
    };

    mockUseLiveState.mockReturnValue({
      data: { alerts: [mockAlert] },
      loading: false,
      isStale: false,
    });

    render(
      <MemoryRouter>
        <AlertsPage />
      </MemoryRouter>,
    );

    // Check English alert rendered
    expect(screen.getByText(/Bus 23 is likely to skip/)).toBeDefined();
    expect(screen.getByText(/High Severity/i)).toBeDefined();

    // Toggle language to Hindi
    const hiButton = screen.getByText("हिन्दी");
    fireEvent.click(hiButton);

    // Check Hindi message rendered
    expect(screen.getByText(/कॉरिडोर में भीड़ के कारण बस 23/)).toBeDefined();
  });
});

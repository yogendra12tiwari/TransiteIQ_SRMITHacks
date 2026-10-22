import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpeedSafetySlider } from "../src/components/SpeedSafetySlider";
import { RouteCompareCard } from "../src/components/RouteCompareCard";
import type { RouteOption } from "@transitiq/shared";

describe("SpeedSafetySlider (M4-19, M4-24)", () => {
  it("renders with accessible attributes and updates preference", () => {
    const handleChange = vi.fn();
    const { rerender } = render(<SpeedSafetySlider alpha={0.5} onChange={handleChange} />);

    const slider = screen.getByRole("slider");
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-valuenow", "0.5");
    expect(screen.getByTestId("slider-mode-label")).toHaveTextContent("Balanced");

    fireEvent.change(slider, { target: { value: "0.2" } });
    expect(handleChange).toHaveBeenCalledWith(0.2);

    // Rerender with 0.2 (Safest)
    rerender(<SpeedSafetySlider alpha={0.2} onChange={handleChange} />);
    expect(screen.getByTestId("slider-mode-label")).toHaveTextContent("Prioritize Safer Route");

    // Rerender with 0.8 (Fastest)
    rerender(<SpeedSafetySlider alpha={0.8} onChange={handleChange} />);
    expect(screen.getByTestId("slider-mode-label")).toHaveTextContent("Prioritize Faster Arrival");
  });
});

describe("RouteCompareCard & Takeaway Banner (M4-17, M4-18, M4-21, M4-24)", () => {
  const dummyFastest: RouteOption = {
    id: "route_fastest_test",
    label: "Fastest",
    travelMin: 28,
    waitMin: 14,
    walkMin: 6,
    boardingStopId: "stop_A",
    exposureMinutes: 16,
    riskLabel: "High",
    waitRiskScore: 0.795,
    polyline: [
      [26.85, 80.96],
      [26.856, 81.0],
    ],
    cost: 22,
  };

  const dummySafer: RouteOption = {
    id: "route_safer_test",
    label: "Safer",
    travelMin: 32,
    waitMin: 4,
    walkMin: 5,
    boardingStopId: "stop_B",
    exposureMinutes: 3,
    riskLabel: "Low",
    waitRiskScore: 0.325,
    polyline: [
      [26.85, 80.96],
      [26.856, 81.0],
    ],
    cost: 17.5,
  };

  it("renders both options side by side with golden metrics", () => {
    const onSelect = vi.fn();
    render(<RouteCompareCard fastest={dummyFastest} safer={dummySafer} onSelectRoute={onSelect} />);

    // Verify Fastest card
    expect(screen.getByTestId("route-card-fastest")).toBeInTheDocument();
    expect(screen.getByTestId("travel-time-fastest")).toHaveTextContent("28");
    expect(screen.getByTestId("wait-time-fastest")).toHaveTextContent("14 min at Stop A");
    expect(screen.getByTestId("exposure-time-fastest")).toHaveTextContent("16");

    // Verify Safer card
    expect(screen.getByTestId("route-card-safer")).toBeInTheDocument();
    expect(screen.getByTestId("travel-time-safer")).toHaveTextContent("32");
    expect(screen.getByTestId("wait-time-safer")).toHaveTextContent("4 min at Stop B");
    expect(screen.getByTestId("exposure-time-safer")).toHaveTextContent("3");

    // Verify Takeaway banner
    const banner = screen.getByTestId("takeaway-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("4 extra minutes saves 10 minutes of unsafe waiting");
  });

  it("selects route on user click", () => {
    const onSelect = vi.fn();
    render(<RouteCompareCard fastest={dummyFastest} safer={dummySafer} onSelectRoute={onSelect} />);

    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    fireEvent.click(selectButtons[0]!);
    expect(onSelect).toHaveBeenCalledWith(dummyFastest);
  });

  it("expands 'Why?' drawer to show calculation details", () => {
    const onSelect = vi.fn();
    render(<RouteCompareCard fastest={dummyFastest} safer={dummySafer} onSelectRoute={onSelect} />);

    const whyButtons = screen.getAllByText(/why this risk score/i);
    fireEvent.click(whyButtons[0]!);
    expect(screen.getByText(/Formula: 14m × 0.84/i)).toBeInTheDocument();
  });
});

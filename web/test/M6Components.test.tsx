import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ReportPage } from "../src/pages/Report";
import { PriorityTable } from "../src/components/PriorityTable";
import { ReviewQueue } from "../src/components/ReviewQueue";
import { SystemHealthCard } from "../src/components/SystemHealthCard";

describe("Milestone M6 UI Components", () => {
  it("renders ReportPage with category chips, stop selector, and anonymity guarantee", () => {
    render(
      <BrowserRouter>
        <ReportPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(/Anonymous Safety Report/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Privacy Protected & Anonymous/i)).toBeInTheDocument();
    expect(screen.getByText(/Poor Lighting \/ Darkness/i)).toBeInTheDocument();
    expect(screen.getByText(/Harassment \/ Safety Concern/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Transit Stop/i)).toBeInTheDocument();

    // Toggle Hindi
    const langBtn = screen.getByRole("button", { name: /Toggle language/i });
    fireEvent.click(langBtn);
    expect(screen.getByText(/गुमनाम सुरक्षा रिपोर्ट/i)).toBeInTheDocument();
  });

  it("renders PriorityTable with the headline row for Stop A (M6-32 requirement)", () => {
    const stops = [
      {
        stopId: "stop_A",
        stopName: "Stop A (Hazratganj)",
        avgEveningWaitMin: 18,
        safetyReportsCount: 7,
        riskBand: "high" as const,
        recommendedAction: "Add 20:15 departure; upgrade high-mast lighting",
        ridershipPerEvening: 420,
      },
      {
        stopId: "stop_B",
        stopName: "Stop B (Charbagh)",
        avgEveningWaitMin: 4,
        safetyReportsCount: 1,
        riskBand: "low" as const,
        recommendedAction: "Maintain 8-min headway",
        ridershipPerEvening: 680,
      },
    ];

    render(<PriorityTable stops={stops} />);

    // Must match PRD §10.4 & M6-32 exact headline structure
    expect(
      screen.getByText("Stop A (Hazratganj): average evening wait 18 minutes, 7 safety-related reports"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Add 20:15 departure/i)).toBeInTheDocument();
    expect(screen.getByText(/Priority #1/i)).toBeInTheDocument();
  });

  it("renders ReviewQueue with restricted badge and harassment triage items", () => {
    render(<ReviewQueue />);

    expect(screen.getByText(/Confidential Human Review Queue/i)).toBeInTheDocument();
    expect(screen.getByText(/RESTRICTED/i)).toBeInTheDocument();
    expect(screen.getByText(/Stop A \(Hazratganj\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PII Filter: Verified Redacted/i).length).toBeGreaterThan(0);
  });

  it("renders SystemHealthCard with AI pipeline, guard blocks, and ETA MAE metrics", () => {
    render(<SystemHealthCard />);

    expect(screen.getByText(/System Integrity & Model Health/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Triage Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/1.63m/i)).toBeInTheDocument();
    expect(screen.getByText(/Guardrail Filters/i)).toBeInTheDocument();
  });
});

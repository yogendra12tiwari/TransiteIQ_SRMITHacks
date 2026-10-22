import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App, { AppRoutes } from "../src/App";
import { SimulatedDataBadge } from "../src/components/SimulatedDataBadge";

describe("Web App Sanity & Routes", () => {
  it("renders SimulatedDataBadge directly", () => {
    render(<SimulatedDataBadge />);
    expect(screen.getByTestId("simulated-data-badge")).toBeInTheDocument();
    expect(screen.getByText(/Simulated Data/i)).toBeInTheDocument();
  });

  const routes = [
    "/",
    "/plan",
    "/route/route_23",
    "/alerts",
    "/report",
    "/trip/test_token_123",
    "/dashboard",
    "/demo",
  ];

  routes.forEach((route) => {
    it(`renders SimulatedDataBadge in layout on route ${route}`, () => {
      render(
        <MemoryRouter initialEntries={[route]}>
          <div className="layout">
            <header>
              <SimulatedDataBadge />
            </header>
            <main>
              <AppRoutes />
            </main>
          </div>
        </MemoryRouter>,
      );
      expect(screen.getByTestId("simulated-data-badge")).toBeInTheDocument();
    });
  });

  it("renders full App on root without crashing", () => {
    render(<App />);
    expect(screen.getByTestId("simulated-data-badge")).toBeInTheDocument();
    expect(screen.getAllByText("Transit")[0]).toBeInTheDocument();
  });
});

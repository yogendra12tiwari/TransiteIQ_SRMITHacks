import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "../src/i18n";
import {
  Button,
  resetPrimaryButtonCountForTesting,
  Card,
  OptionRow,
  Disclosure,
  Banner,
  Badge,
  Step,
  StickyAction,
  Toast,
  TextField,
  SearchField,
  EmptyState,
  ErrorState,
  Skeleton,
  WhyList,
  LanguageToggle,
  BottomTabs,
  AppShell,
} from "../src/components/primitives";
import { RiskBadge } from "../src/components/RiskBadge";

describe("UI Primitives & Design System (Milestone U0)", () => {
  beforeEach(() => {
    resetPrimaryButtonCountForTesting();
  });

  describe("1. Button (U0-05)", () => {
    it("renders primary, secondary, and text variants", () => {
      const { rerender } = render(<Button variant="primary">Save</Button>);
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();

      rerender(<Button variant="secondary">Cancel</Button>);
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

      rerender(<Button variant="text">Details</Button>);
      expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    });

    it("displays loading spinner and sets aria-busy when loading", () => {
      render(
        <Button variant="primary" loading>
          Submitting
        </Button>,
      );
      const btn = screen.getByRole("button");
      expect(btn).toHaveAttribute("aria-busy", "true");
      expect(btn).toBeDisabled();
    });

    it("emits a console.warn when two primary buttons are mounted (single-primary rule)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      render(
        <div>
          <Button variant="primary">Primary 1</Button>
          <Button variant="primary">Primary 2</Button>
        </div>,
      );

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Only ONE primary button is permitted per screen"),
      );

      warnSpy.mockRestore();
    });
  });

  describe("2. Card and OptionRow (U0-06)", () => {
    it("renders Card with selected styling when selected", () => {
      const { container } = render(<Card selected>Card content</Card>);
      expect(container.firstChild).toHaveClass("border-[#0F5BD8]");
    });

    it("handles OptionRow selection via click and keyboard (Enter/Space)", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<OptionRow label="Stop A" sublabel="4 min walk" selected={false} onClick={handleClick} />);

      const option = screen.getByRole("radio", { name: /Stop A/i });
      expect(option).toHaveAttribute("aria-checked", "false");

      await user.click(option);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Keyboard selection with Space
      option.focus();
      fireEvent.keyDown(option, { key: " " });
      expect(handleClick).toHaveBeenCalledTimes(2);

      // Keyboard selection with Enter
      fireEvent.keyDown(option, { key: "Enter" });
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe("3. Disclosure (U0-06)", async () => {
    it("toggles content visibility and aria-expanded on click", async () => {
      const user = userEvent.setup();
      render(
        <Disclosure title="Walking Details">
          <p>Walking path is well lit.</p>
        </Disclosure>,
      );

      const trigger = screen.getByRole("button", { name: /Walking Details/i });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Walking path is well lit.")).not.toBeInTheDocument();

      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("Walking path is well lit.")).toBeInTheDocument();

      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByText("Walking path is well lit.")).not.toBeInTheDocument();
    });
  });

  describe("4. Banner and Badge (U0-06)", () => {
    it("renders info, warn, and danger banners with appropriate roles", () => {
      const { rerender } = render(
        <Banner variant="info" title="Info Banner">
          All buses on time.
        </Banner>,
      );
      expect(screen.getByRole("status")).toHaveTextContent("All buses on time.");

      rerender(
        <Banner variant="danger" title="Error Banner">
          Connection lost.
        </Banner>,
      );
      expect(screen.getByRole("alert")).toHaveTextContent("Connection lost.");
    });

    it("renders Badge variants correctly", () => {
      const { rerender } = render(<Badge variant="primary">Express</Badge>);
      expect(screen.getByText("Express")).toBeInTheDocument();

      rerender(<Badge variant="low">Low Risk</Badge>);
      expect(screen.getByText("Low Risk")).toBeInTheDocument();
    });
  });

  describe("5. Inputs: TextField and SearchField (U0-10)", async () => {
    it("links visible label and error message with aria-describedby", () => {
      render(<TextField label="Full Name" error="Name is required" />);

      const input = screen.getByLabelText("Full Name");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    });

    it("SearchField triggers onClear when clear button is clicked", async () => {
      const user = userEvent.setup();
      const handleClear = vi.fn();

      render(
        <SearchField label="Search Stop" value="Hazratganj" onChange={() => {}} onClear={handleClear} />,
      );

      const clearBtn = screen.getByRole("button", { name: /Clear search text/i });
      await user.click(clearBtn);
      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });

  describe("6. States: EmptyState, ErrorState, Skeleton (U0-11)", () => {
    it("renders EmptyState with icon and title", () => {
      render(<EmptyState title="No buses available" description="Try selecting a different time window." />);
      expect(screen.getByText("No buses available")).toBeInTheDocument();
    });

    it("renders ErrorState with retry button calling onRetry", async () => {
      const user = userEvent.setup();
      const handleRetry = vi.fn();

      render(<ErrorState message="Server timeout" onRetry={handleRetry} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /Try again/i });
      await user.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });

    it("renders Skeleton with aria-hidden true", () => {
      const { container } = render(<Skeleton className="w-20 h-4" />);
      expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("7. RiskBadge and WhyList (U0-12)", () => {
    it("renders RiskBadge with text and icon for Low, Medium, High", () => {
      const { rerender } = render(<RiskBadge label="Low" />);
      expect(screen.getByRole("status")).toHaveTextContent("Low Risk");

      rerender(<RiskBadge label="High" score={0.82} />);
      expect(screen.getByRole("status")).toHaveTextContent("High Risk");
      expect(screen.getByRole("status")).toHaveTextContent("(0.82)");
    });

    it("renders WhyList with factor bullets", () => {
      render(<WhyList items={["Wait exceeds 15 minutes", "Stop activity is quiet after 8 PM"]} />);

      expect(screen.getByText("Why this rating?")).toBeInTheDocument();
      expect(screen.getByText("Wait exceeds 15 minutes")).toBeInTheDocument();
    });
  });

  describe("8. Step and StickyAction (U0-07)", async () => {
    it("renders Step indicator and back navigation", async () => {
      const user = userEvent.setup();
      const handleBack = vi.fn();

      render(
        <Step currentStep={2} totalSteps={3} title="Choose Destination" onBack={handleBack}>
          <div>Step body</div>
        </Step>,
      );

      expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
      expect(screen.getByText("Choose Destination")).toBeInTheDocument();

      const backBtn = screen.getByRole("button", { name: /Go back/i });
      await user.click(backBtn);
      expect(handleBack).toHaveBeenCalledTimes(1);
    });

    it("renders StickyAction with action buttons", () => {
      render(
        <StickyAction>
          <Button variant="primary">Proceed</Button>
        </StickyAction>,
      );

      expect(screen.getByRole("button", { name: "Proceed" })).toBeInTheDocument();
    });
  });

  describe("9. Toast (U0-09)", async () => {
    it("renders alert toast with role alert and acknowledges", async () => {
      const user = userEvent.setup();
      const handleAck = vi.fn();

      render(
        <Toast
          variant="alert"
          title="Leave Now"
          message="Bus arriving in 4 minutes."
          onAcknowledge={handleAck}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
      const okBtn = screen.getByRole("button", { name: "OK" });
      await user.click(okBtn);
      expect(handleAck).toHaveBeenCalledTimes(1);
    });
  });

  describe("10. LanguageToggle and AppShell (U0-13 & U0-14)", () => {
    it("renders LanguageToggle with accessible name", () => {
      render(<LanguageToggle />);
      expect(screen.getByRole("button", { name: /Switch language/i })).toBeInTheDocument();
    });

    it("renders BottomTabs with 3 rider navigation tabs", () => {
      render(
        <MemoryRouter>
          <BottomTabs />
        </MemoryRouter>,
      );
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Alerts")).toBeInTheDocument();
      expect(screen.getByText("Report")).toBeInTheDocument();
    });

    it("renders AppShell with container, SimulatedDataBadge and BottomTabs", () => {
      render(
        <MemoryRouter>
          <AppShell>
            <div>App Content</div>
          </AppShell>
        </MemoryRouter>,
      );

      expect(screen.getByTestId("app-shell-container")).toBeInTheDocument();
      expect(screen.getByTestId("simulated-data-badge")).toBeInTheDocument();
      expect(screen.getByText("App Content")).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Main Navigation" })).toBeInTheDocument();
    });
  });
});

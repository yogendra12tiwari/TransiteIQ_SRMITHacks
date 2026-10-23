import React from "react";
import { SimulatedDataBadge } from "../SimulatedDataBadge";
import { LanguageToggle } from "./LanguageToggle";
import { BottomTabs } from "./BottomTabs";

export interface AppShellProps {
  children: React.ReactNode;
  showBottomTabs?: boolean;
  className?: string;
}

export function AppShell({ children, showBottomTabs = true, className = "" }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#111827] flex flex-col justify-between">
      {/* Phone frame wrapper on >= 1024px desktop widths */}
      <div className="w-full flex-1 flex justify-center lg:py-6">
        <div
          data-testid="app-shell-container"
          className="w-full lg:max-w-[420px] lg:h-[840px] lg:rounded-[36px] lg:border-[8px] lg:border-[#111827] lg:shadow-2xl bg-white flex flex-col overflow-hidden relative"
        >
          {/* Top persistent header bar */}
          <header className="px-4 py-3 border-b border-[#D8DEE6] bg-white flex items-center justify-between z-30 shrink-0">
            <SimulatedDataBadge />
            <LanguageToggle />
          </header>

          {/* Main scrollable view content */}
          <main
            className={`flex-1 overflow-y-auto relative flex flex-col ${showBottomTabs ? "pb-20" : ""} ${className}`}
          >
            {children}
          </main>

          {/* Bottom rider tabs */}
          {showBottomTabs && <BottomTabs />}
        </div>
      </div>
    </div>
  );
}

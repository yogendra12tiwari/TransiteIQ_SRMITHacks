import React from "react";

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function PhoneFrame({ children, className = "" }: PhoneFrameProps) {
  return (
    <div className="w-full flex justify-center py-2 sm:py-6">
      <div
        data-testid="phone-frame"
        className={`w-full md:max-w-[420px] md:h-[840px] md:rounded-[40px] md:border-[10px] md:border-slate-800 md:shadow-2xl md:ring-1 md:ring-slate-700/80 bg-slate-900 flex flex-col overflow-hidden relative ${className}`}
      >
        {/* Subtle camera punch hole on desktop phone frame */}
        <div className="hidden md:flex justify-center pt-2 pb-1 bg-slate-900 z-30 select-none">
          <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-950" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 overflow-y-auto relative flex flex-col">{children}</div>
      </div>
    </div>
  );
}

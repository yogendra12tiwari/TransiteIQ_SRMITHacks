import React from "react";
import { ChevronLeft } from "lucide-react";

export interface StepProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Step({ currentStep, totalSteps, title, onBack, children, className = "" }: StepProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#D8DEE6]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back to previous step"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center -ml-2 text-[#111827] hover:bg-[#F5F7FA] rounded-full focus:outline-none focus:ring-3 focus:ring-[#111827] cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <div className="text-sm font-semibold text-[#4B5563]">
          Step {currentStep} of {totalSteps}
        </div>

        <div className="w-10" />
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-[#111827] tracking-tight">{title}</h2>
        {/* Visual progress bar */}
        <div className="w-full bg-[#EAEFF5] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#0F5BD8] h-full transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="pt-2">{children}</div>
    </div>
  );
}

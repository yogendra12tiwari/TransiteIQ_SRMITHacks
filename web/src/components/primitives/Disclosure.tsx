import React, { useState, useId } from "react";
import { ChevronDown } from "lucide-react";

export interface DisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Disclosure({ title, children, defaultOpen = false, className = "" }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className={`border border-[#D8DEE6] rounded-[12px] overflow-hidden bg-white ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full min-h-[48px] px-4 py-3 text-left font-medium text-base text-[#111827] flex items-center justify-between gap-2 hover:bg-[#F5F7FA] focus:outline-none focus:ring-3 focus:ring-[#111827] cursor-pointer"
      >
        <span>{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#4B5563] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div id={contentId} className="px-4 pb-4 pt-1 text-sm text-[#4B5563] border-t border-[#D8DEE6]">
          {children}
        </div>
      )}
    </div>
  );
}

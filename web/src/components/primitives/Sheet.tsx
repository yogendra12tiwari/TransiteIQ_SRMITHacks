import React, { useState } from "react";

export interface SheetProps {
  children: React.ReactNode;
  snapPoints?: ("peek" | "half" | "full")[];
  initialSnap?: "peek" | "half" | "full";
  title?: string;
  position?: "fixed" | "absolute";
  className?: string;
}

export function Sheet({
  children,
  initialSnap = "half",
  title,
  position = "fixed",
  className = "",
}: SheetProps) {
  const [snap, setSnap] = useState<"peek" | "half" | "full">(initialSnap);

  const heightStyles = {
    peek: "max-h-[140px]",
    half: "max-h-[55vh]",
    full: "max-h-[85vh]",
  }[snap];

  const cycleSnap = () => {
    setSnap((prev) => {
      if (prev === "peek") return "half";
      if (prev === "half") return "full";
      return "peek";
    });
  };

  const posClass = position === "absolute" ? "absolute" : "fixed";

  return (
    <section
      aria-label={title || "Details panel"}
      className={`${posClass} bottom-0 left-0 right-0 z-20 bg-white border-t border-[#D8DEE6] rounded-t-[16px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-all duration-300 flex flex-col ${heightStyles} ${className}`}
    >
      {/* Draggable grab handle */}
      <button
        type="button"
        onClick={cycleSnap}
        aria-label={`Toggle sheet height, currently ${snap}`}
        className="w-full py-2.5 flex items-center justify-center cursor-pointer hover:bg-[#F5F7FA] rounded-t-[16px] focus:outline-none focus:ring-2 focus:ring-[#111827]"
      >
        <span className="w-10 h-1.5 rounded-full bg-[#D8DEE6] block" />
      </button>

      {title && (
        <div className="px-4 pb-2 border-b border-[#D8DEE6] font-semibold text-base text-[#111827]">
          {title}
        </div>
      )}

      <div className="p-4 overflow-y-auto flex-1 overscroll-contain">{children}</div>
    </section>
  );
}

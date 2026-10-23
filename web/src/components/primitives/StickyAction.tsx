import React from "react";

export interface StickyActionProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyAction({ children, className = "" }: StickyActionProps) {
  return (
    <div
      className={`sticky bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-sm border-t border-[#D8DEE6] z-30 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div className="max-w-md mx-auto w-full flex flex-col gap-2">{children}</div>
    </div>
  );
}

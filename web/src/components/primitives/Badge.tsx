import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "low" | "medium" | "high" | "subtle";
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({ children, variant = "default", icon, className = "" }: BadgeProps) {
  const variantStyles = {
    default: "bg-[#F5F7FA] text-[#111827] border border-[#D8DEE6]",
    primary: "bg-[#EAF1FE] text-[#0F5BD8] border border-[#B9D3FC]",
    low: "bg-[#1B7F3B]/10 text-[#1B7F3B] border border-[#1B7F3B]/30",
    medium: "bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/30",
    high: "bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/30",
    subtle: "bg-transparent text-[#4B5563] border border-[#D8DEE6]",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none ${variantStyles} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

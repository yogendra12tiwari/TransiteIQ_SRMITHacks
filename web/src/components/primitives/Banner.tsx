import React from "react";
import { Info, AlertTriangle, AlertCircle } from "lucide-react";

export interface BannerProps {
  variant?: "info" | "warn" | "warning" | "danger";
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Banner({ variant = "info", title, children, action, className = "" }: BannerProps) {
  const resolvedVariant = variant === "warning" ? "warn" : variant;
  const config = {
    info: {
      bg: "bg-[#EAF1FE] border-[#B9D3FC] text-[#111827]",
      icon: <Info className="w-5 h-5 text-[#0F5BD8] shrink-0" aria-hidden="true" />,
    },
    warn: {
      bg: "bg-[#FFF4E0] border-[#FDE2B0] text-[#111827]",
      icon: <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0" aria-hidden="true" />,
    },
    danger: {
      bg: "bg-[#FDECEC] border-[#F9C3C3] text-[#111827]",
      icon: <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0" aria-hidden="true" />,
    },
  }[resolvedVariant] || {
    bg: "bg-[#FFF4E0] border-[#FDE2B0] text-[#111827]",
    icon: <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0" aria-hidden="true" />,
  };

  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={`rounded-[12px] p-4 border flex items-start gap-3 ${config.bg} ${className}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-sm sm:text-base text-[#111827] mb-0.5">{title}</div>}
        <div className="text-sm leading-relaxed text-[#111827]">{children}</div>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
}

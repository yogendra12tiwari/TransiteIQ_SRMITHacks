import type { RiskLabel } from "@transitiq/shared";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export interface RiskBadgeProps {
  label: RiskLabel;
  score?: number;
  className?: string;
  onClick?: () => void;
}

export function RiskBadge({ label, score, className = "", onClick }: RiskBadgeProps) {
  const config = {
    Low: {
      style: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />,
      text: "Low Risk",
      aria: "Low safety risk",
    },
    Medium: {
      style: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />,
      text: "Medium Risk",
      aria: "Medium safety risk",
    },
    High: {
      style: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />,
      text: "High Risk",
      aria: "High safety risk",
    },
  }[label] ?? {
    style: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    icon: null,
    text: "Unknown Risk",
    aria: "Unknown risk",
  };

  return (
    <span
      role="status"
      aria-label={`${config.aria}${typeof score === "number" ? ` (score ${score})` : ""}`}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border select-none ${
        config.style
      } ${onClick ? "cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#111827]" : ""} ${className}`}
      tabIndex={onClick ? 0 : undefined}
    >
      {config.icon}
      <span>{config.text}</span>
      {typeof score === "number" && (
        <span className="opacity-75 font-mono text-[10px]">({score.toFixed(2)})</span>
      )}
    </span>
  );
}

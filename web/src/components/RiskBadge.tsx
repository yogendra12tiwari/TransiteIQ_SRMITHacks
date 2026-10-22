import type { RiskLabel } from "@transitiq/shared";

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
      dot: "bg-emerald-400",
      aria: "Low safety risk",
    },
    Medium: {
      style: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      dot: "bg-amber-400",
      aria: "Medium safety risk",
    },
    High: {
      style: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      dot: "bg-rose-400",
      aria: "High safety risk",
    },
  }[label] ?? {
    style: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    dot: "bg-slate-400",
    aria: "Unknown risk",
  };

  return (
    <span
      role="status"
      aria-label={`${config.aria}${typeof score === "number" ? ` (score ${score})` : ""}`}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.style} ${onClick ? "cursor-pointer hover:opacity-90" : ""} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{label} Risk</span>
      {typeof score === "number" && (
        <span className="opacity-75 font-mono text-[10px]">({score.toFixed(2)})</span>
      )}
    </span>
  );
}

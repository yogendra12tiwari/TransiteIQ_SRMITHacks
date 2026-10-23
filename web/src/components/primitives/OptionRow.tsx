import React from "react";

export interface OptionRowProps {
  label: string;
  sublabel?: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function OptionRow({
  label,
  sublabel,
  selected = false,
  onClick,
  icon,
  rightAddon,
  disabled = false,
  className = "",
}: OptionRowProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`min-h-[48px] px-4 py-3 rounded-[12px] border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer select-none focus:outline-none focus:ring-3 focus:ring-[#111827] ${
        selected
          ? "bg-[#EAF1FE] border-[#0F5BD8] text-[#111827]"
          : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-[#F5F7FA]"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected ? "border-[#0F5BD8] bg-[#0F5BD8]" : "border-[#4B5563] bg-transparent"
          }`}
          aria-hidden="true"
        >
          {selected && <span className="w-2 h-2 rounded-full bg-white" />}
        </span>

        {icon && <span className="text-[#4B5563] shrink-0">{icon}</span>}

        <div className="min-w-0">
          <div className="text-base font-medium truncate text-[#111827]">{label}</div>
          {sublabel && <div className="text-sm text-[#4B5563] truncate">{sublabel}</div>}
        </div>
      </div>

      {rightAddon && <div className="shrink-0">{rightAddon}</div>}
    </div>
  );
}

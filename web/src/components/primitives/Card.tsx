import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  selected?: boolean;
  interactive?: boolean;
}

export function Card({
  children,
  selected = false,
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  const base = "rounded-[12px] p-4 sm:p-5 transition-all duration-150 border";

  const stateStyles = selected
    ? "bg-[#EAF1FE] border-[#0F5BD8] ring-2 ring-[#0F5BD8]/20"
    : "bg-[#F5F7FA] border-[#D8DEE6]";

  const interactiveStyles = interactive
    ? "cursor-pointer hover:border-[#0F5BD8]/50 active:scale-[0.99] focus:outline-none focus:ring-3 focus:ring-[#111827]"
    : "";

  return (
    <div
      className={`${base} ${stateStyles} ${interactiveStyles} ${className}`}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

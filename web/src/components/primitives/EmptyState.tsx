import React from "react";
import { Info } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`text-center py-10 px-4 flex flex-col items-center justify-center max-w-sm mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#F5F7FA] border border-[#D8DEE6] flex items-center justify-center text-[#4B5563] mb-3">
        {icon || <Info className="w-6 h-6 text-[#4B5563]" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-bold text-[#111827]">{title}</h3>
      <p className="text-sm text-[#4B5563] mt-1 leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

import React from "react";
import { Bell, Info, CheckCircle } from "lucide-react";

export interface ToastProps {
  variant?: "alert" | "status" | "success";
  title: string;
  message: string;
  onAcknowledge?: () => void;
  actionLabel?: string;
  secondaryAction?: React.ReactNode;
  visible?: boolean;
  className?: string;
}

export function Toast({
  variant = "status",
  title,
  message,
  onAcknowledge,
  actionLabel = "OK",
  secondaryAction,
  visible = true,
  className = "",
}: ToastProps) {
  if (!visible) return null;

  const isAlert = variant === "alert";

  return (
    <div
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={`fixed top-4 left-4 right-4 max-w-md mx-auto z-50 rounded-[12px] p-4 shadow-xl border transition-all duration-200 ${
        isAlert
          ? "bg-[#111827] text-white border-amber-500/50 ring-2 ring-amber-500/20"
          : "bg-white text-[#111827] border-[#D8DEE6]"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isAlert ? (
            <Bell className="w-5 h-5 text-amber-400 animate-bounce" aria-hidden="true" />
          ) : variant === "success" ? (
            <CheckCircle className="w-5 h-5 text-[#1B7F3B]" aria-hidden="true" />
          ) : (
            <Info className="w-5 h-5 text-[#0F5BD8]" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-base leading-snug mb-1">{title}</div>
          <div className={`text-sm leading-relaxed ${isAlert ? "text-slate-300" : "text-[#4B5563]"}`}>
            {message}
          </div>

          {(onAcknowledge || secondaryAction) && (
            <div className="mt-3 flex items-center gap-3">
              {onAcknowledge && (
                <button
                  type="button"
                  onClick={onAcknowledge}
                  className={`min-h-[48px] px-4 py-2 rounded-[8px] text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isAlert
                      ? "bg-amber-500 text-[#111827] hover:bg-amber-400 focus:ring-amber-400"
                      : "bg-[#0F5BD8] text-white hover:bg-[#0D4EB8] focus:ring-[#0F5BD8]"
                  }`}
                >
                  {actionLabel}
                </button>
              )}
              {secondaryAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

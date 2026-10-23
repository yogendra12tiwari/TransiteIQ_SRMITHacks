import { AlertTriangle } from "lucide-react";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`text-center py-8 px-4 rounded-[12px] bg-[#FDECEC] border border-[#F9C3C3] max-w-sm mx-auto flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#B91C1C] mb-2 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-[#B91C1C]" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-[#111827]">{title}</h3>
      <p className="text-sm text-[#111827] mt-1 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-[48px] px-5 py-2.5 rounded-[12px] bg-[#111827] text-white font-medium text-sm hover:bg-black focus:outline-none focus:ring-3 focus:ring-[#111827] cursor-pointer"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

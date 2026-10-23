import React, { useId } from "react";
import { Search, X } from "lucide-react";

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  onClear?: () => void;
  hideLabel?: boolean;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ label, value, onClear, hideLabel = false, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="space-y-1.5 w-full text-left">
        <label
          htmlFor={inputId}
          className={hideLabel ? "sr-only" : "block text-sm font-semibold text-[#111827]"}
        >
          {label}
        </label>

        <div className="relative flex items-center">
          <Search
            className="w-5 h-5 text-[#4B5563] absolute left-3.5 pointer-events-none"
            aria-hidden="true"
          />

          <input
            ref={ref}
            id={inputId}
            type="search"
            value={value}
            className={`w-full min-h-[48px] pl-10 pr-10 py-2.5 rounded-[12px] border border-[#D8DEE6] text-base text-[#111827] bg-white transition-colors placeholder:text-[#4B5563]/70 focus:outline-none focus:ring-3 focus:ring-[#111827] ${className}`}
            {...props}
          />

          {value && onClear && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search text"
              className="absolute right-2.5 min-h-[36px] min-w-[36px] flex items-center justify-center text-[#4B5563] hover:text-[#111827] rounded-full focus:outline-none focus:ring-2 focus:ring-[#111827] cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  },
);

SearchField.displayName = "SearchField";

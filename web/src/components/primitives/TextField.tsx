import React, { useId } from "react";

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = error ? errorId : helperText ? helperId : undefined;

    return (
      <div className="space-y-1.5 w-full text-left">
        <label htmlFor={inputId} className="block text-sm font-semibold text-[#111827]">
          {label}
        </label>

        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-[12px] border text-base text-[#111827] bg-white transition-colors placeholder:text-[#4B5563]/60 focus:outline-none focus:ring-3 focus:ring-[#111827] ${
            error ? "border-[#B91C1C] focus:border-[#B91C1C]" : "border-[#D8DEE6] focus:border-[#0F5BD8]"
          } ${className}`}
          {...props}
        />

        {error && (
          <div id={errorId} role="alert" className="text-sm font-medium text-[#B91C1C]">
            {error}
          </div>
        )}

        {!error && helperText && (
          <div id={helperId} className="text-sm text-[#4B5563]">
            {helperText}
          </div>
        )}
      </div>
    );
  },
);

TextField.displayName = "TextField";

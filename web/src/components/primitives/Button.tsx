import React, { useEffect } from "react";
import { incrementPrimaryButtonCount, decrementPrimaryButtonCount } from "./buttonState";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "text";
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", loading = false, disabled = false, children, className = "", ...props }, ref) => {
    useEffect(() => {
      if (variant === "primary") {
        const count = incrementPrimaryButtonCount();
        if (process.env.NODE_ENV !== "production" && count > 1) {
          console.warn(
            `[TransitIQ UI Rule] Only ONE primary button is permitted per screen (Principle: One screen, one primary action). Currently ${count} primary buttons are mounted.`,
          );
        }

        return () => {
          decrementPrimaryButtonCount();
        };
      }
    }, [variant]);

    const baseStyles =
      "min-h-[48px] px-5 py-3 rounded-[12px] text-base font-semibold transition-colors duration-150 inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-3 focus:ring-[#111827] disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variantStyles = {
      primary: "bg-[#0F5BD8] text-white hover:bg-[#0D4EB8] active:bg-[#0B429E] shadow-sm",
      secondary: "bg-[#F5F7FA] text-[#111827] border border-[#D8DEE6] hover:bg-[#EAEFF5] active:bg-[#DFE5ED]",
      text: "bg-transparent text-[#0F5BD8] hover:bg-[#0F5BD8]/5 active:bg-[#0F5BD8]/10 underline-offset-4 hover:underline",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles} ${className}`}
        aria-busy={loading ? "true" : undefined}
        {...props}
      >
        {loading && (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block"
            aria-hidden="true"
          />
        )}
        <span>{children}</span>
      </button>
    );
  },
);

Button.displayName = "Button";

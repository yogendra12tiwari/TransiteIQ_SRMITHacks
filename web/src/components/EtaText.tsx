import { useTranslation } from "react-i18next";

export interface EtaTextProps {
  lowMin: number;
  highMin: number;
  isLikelySkip?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  lang?: "en" | "hi";
}

export function EtaText({
  lowMin,
  highMin,
  isLikelySkip = false,
  className = "",
  size = "md",
}: EtaTextProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "hi" ? "hi" : "en";

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
    xl: "text-2xl sm:text-3xl font-bold tracking-tight",
  }[size];

  if (isLikelySkip) {
    return (
      <span
        data-testid="eta-text-skip"
        className={`text-[#B91C1C] font-semibold flex items-center gap-1.5 ${sizeClasses} ${className}`}
      >
        <span aria-hidden="true">⚠️</span>
        <span>{t("alert.skip", "This bus may not stop here")}</span>
      </span>
    );
  }

  const isNow = lowMin <= 1;

  if (isNow) {
    return (
      <span data-testid="eta-text-now" className={`text-[#047857] font-bold ${sizeClasses} ${className}`}>
        {t("eta.now", "Arriving now")}
      </span>
    );
  }

  return (
    <span data-testid="eta-text-range" className={`text-[#111827] font-semibold ${sizeClasses} ${className}`}>
      {currentLang === "hi" ? (
        <span>
          <span className="font-bold text-[#0F5BD8]">
            {lowMin}–{highMin}
          </span>{" "}
          मिनट में पहुँचेगी
        </span>
      ) : (
        <span>
          Arriving in{" "}
          <span className="font-bold text-[#0F5BD8]">
            {lowMin}–{highMin}
          </span>{" "}
          min
        </span>
      )}
    </span>
  );
}

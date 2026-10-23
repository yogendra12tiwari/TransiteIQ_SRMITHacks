import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { RouteOption } from "@transitiq/shared";
import { Card } from "./primitives/Card";
import { Badge } from "./primitives/Badge";
import { RiskBadge } from "./RiskBadge";

export interface RouteOptionCardProps {
  option: RouteOption;
  isRecommended?: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  lang?: "en" | "hi";
  stopNames?: Record<string, string>;
  className?: string;
}

export function RouteOptionCard({
  option,
  isRecommended = false,
  isSelected = false,
  onSelect,
  className = "",
}: RouteOptionCardProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === "hi" ? "hi" : "en";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  const waitRiskScore = option.waitRiskScore ?? 0.5;
  const isLowRisk = waitRiskScore < 0.4;
  const isBusyLit = option.boardingStopId === "stop_B" || waitRiskScore < 0.4;

  return (
    <Card
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      data-testid={`route-option-card-${option.label.toLowerCase()}`}
      className={`p-4 transition-all duration-150 cursor-pointer relative border-2 ${
        isSelected
          ? "border-[#0F5BD8] bg-[#F8FAFC] shadow-md ring-2 ring-[#0F5BD8]/20"
          : "border-[#D8DEE6] bg-white hover:border-[#94A3B8]"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Radio circle + option details */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
              isSelected ? "border-[#0F5BD8] bg-[#0F5BD8] text-white" : "border-[#D8DEE6] bg-white"
            }`}
            aria-hidden="true"
          >
            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isRecommended ? (
                <Badge variant="primary">{t("plan.recommended", "Recommended")}</Badge>
              ) : (
                <Badge variant="subtle">{t("plan.fastest", "Fastest")}</Badge>
              )}

              <span className="font-bold text-lg text-[#111827]">
                {option.travelMin} {currentLang === "hi" ? "मिनट कुल" : "min total"}
              </span>
            </div>

            <p className="text-sm text-[#4B5563]">
              {currentLang === "hi"
                ? `${option.waitMin} मिनट इंतज़ार · ${isBusyLit ? "भीड़-भाड़ वाला और रोशनी वाला" : "सुनसान स्टॉप, लंबा इंतज़ार"}`
                : `Wait ${option.waitMin} min · ${isBusyLit ? "busy, lit" : "quiet stop"}`}
            </p>

            <div className="pt-1">
              <RiskBadge
                label={isLowRisk ? "Low" : waitRiskScore < 0.7 ? "Medium" : "High"}
                score={waitRiskScore}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

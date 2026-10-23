import { useTranslation } from "react-i18next";
import { AlertCircle, AlertTriangle, Clock, Bus } from "lucide-react";
import type { Alert } from "@transitiq/shared";
import { Card } from "./primitives/Card";
import { Badge } from "./primitives/Badge";

export interface AlertCardProps {
  alert: Alert;
  lang?: "en" | "hi";
  className?: string;
  onClick?: () => void;
}

export function AlertCard({ alert, className = "", onClick }: AlertCardProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language === "hi" ? "hi" : "en";

  const messageText = currentLang === "hi" && alert.messageHi ? alert.messageHi : alert.message;

  const severityBadge = {
    high: {
      variant: "high" as const,
      label: currentLang === "hi" ? "गंभीर अलर्ट" : "High Severity",
    },
    medium: {
      variant: "medium" as const,
      label: currentLang === "hi" ? "चेतावनी" : "Advisory",
    },
    low: {
      variant: "subtle" as const,
      label: currentLang === "hi" ? "सूचना" : "Notice",
    },
  }[alert.severity] || {
    variant: "subtle" as const,
    label: "Notice",
  };

  const typeIcon = {
    STALL: <Clock className="w-5 h-5 text-[#B91C1C]" aria-hidden="true" />,
    LIKELY_SKIP: <AlertTriangle className="w-5 h-5 text-[#B45309]" aria-hidden="true" />,
    GHOST_BUS: <Bus className="w-5 h-5 text-[#6D28D9]" aria-hidden="true" />,
    DELAY: <Clock className="w-5 h-5 text-[#0F5BD8]" aria-hidden="true" />,
    ROUTE_DEVIATION: <AlertCircle className="w-5 h-5 text-[#B45309]" aria-hidden="true" />,
    OVERCROWDING: <AlertCircle className="w-5 h-5 text-[#B45309]" aria-hidden="true" />,
  }[alert.type] || <AlertCircle className="w-5 h-5 text-[#4B5563]" aria-hidden="true" />;

  const formattedType = alert.type.replace(/_/g, " ");

  return (
    <Card
      data-testid={`alert-card-${alert.type}`}
      onClick={onClick}
      className={`p-4 bg-white border-[#D8DEE6] space-y-2.5 transition-all shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F5F7FA] border border-[#D8DEE6] flex items-center justify-center shrink-0">
            {typeIcon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827] capitalize">{formattedType}</h3>
            <span className="text-[11px] text-[#4B5563]">
              {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        <Badge variant={severityBadge.variant}>{severityBadge.label}</Badge>
      </div>

      <p className="text-sm text-[#111827] font-medium leading-relaxed">{messageText}</p>

      {alert.affectedStopIds.length > 0 && (
        <div className="pt-2 border-t border-[#D8DEE6] flex items-center gap-1.5 flex-wrap text-xs text-[#4B5563]">
          <span>{currentLang === "hi" ? "प्रभावित स्टॉप:" : "Affected stops:"}</span>
          {alert.affectedStopIds.map((stopId) => (
            <span
              key={stopId}
              className="px-2 py-0.5 rounded-md bg-[#F5F7FA] border border-[#D8DEE6] text-[11px] font-mono font-medium text-[#111827]"
            >
              {stopId}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

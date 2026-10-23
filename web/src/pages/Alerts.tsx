import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, CheckCircle } from "lucide-react";
import type { Alert } from "@transitiq/shared";
import { useLiveState } from "../hooks/useLiveState";
import { AlertCard } from "../components/AlertCard";
import { EmptyState } from "../components/primitives/EmptyState";
import { ErrorState } from "../components/primitives/ErrorState";
import { Skeleton } from "../components/primitives/Skeleton";

export function AlertsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";
  const { data, loading, error } = useLiveState();
  const [filterType, setFilterType] = useState<string>("ALL");

  const alerts: Alert[] = data?.alerts ?? [];

  const filteredAlerts = alerts.filter((alert) => {
    if (filterType === "ALL") return true;
    return alert.type === filterType;
  });

  const filterOptions: { id: string; label: string }[] = [
    { id: "ALL", label: lang === "hi" ? "सभी" : "All" },
    { id: "DELAY", label: lang === "hi" ? "विलंब" : "Delay" },
    { id: "STALL", label: lang === "hi" ? "रुकी बस" : "Stall" },
    { id: "LIKELY_SKIP", label: lang === "hi" ? "स्किप जोखिम" : "Skip Risk" },
    { id: "GHOST_BUS", label: lang === "hi" ? "घोस्ट बस" : "Ghost Bus" },
  ];

  return (
    <div data-testid="alerts-page" className="p-4 space-y-4 max-w-lg mx-auto text-[#111827] pb-24">
      {/* Screen Title & Language Switch */}
      <div className="flex items-center justify-between pb-2 border-b border-[#D8DEE6]">
        <div>
          <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#0F5BD8]" aria-hidden="true" />
            <span>{lang === "hi" ? "सेवा अलर्ट" : "Service Alerts"}</span>
          </h1>
          <p className="text-xs text-[#4B5563] mt-0.5">
            {lang === "hi"
              ? "लखनऊ बस नेटवर्क के लाइव स्वचालित डिटेक्टर"
              : "Live automated alerts across Lucknow routes"}
          </p>
        </div>

        <div className="flex items-center bg-[#F5F7FA] rounded-lg p-0.5 border border-[#D8DEE6] shrink-0">
          <button
            type="button"
            onClick={() => i18n.changeLanguage("en")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md min-h-[36px] transition-colors ${
              lang === "en" ? "bg-[#0F5BD8] text-white" : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => i18n.changeLanguage("hi")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md min-h-[36px] transition-colors ${
              lang === "hi" ? "bg-[#0F5BD8] text-white" : "text-[#4B5563] hover:text-[#111827]"
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* Filter Chips (Min 48px tap targets) */}
      <div
        role="group"
        aria-label="Filter alerts by type"
        className="flex items-center gap-2 overflow-x-auto pb-1 text-xs"
      >
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilterType(opt.id)}
            className={`min-h-[48px] px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
              filterType === opt.id
                ? "bg-[#EFF6FF] border-[#0F5BD8] text-[#0F5BD8]"
                : "bg-white border-[#D8DEE6] text-[#4B5563] hover:text-[#111827] hover:bg-[#F5F7FA]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          title={lang === "hi" ? "अलर्ट लोड करने में त्रुटि" : "Could not load alerts"}
          message={error.message}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Alerts Feed */}
      {!loading && filteredAlerts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-10 h-10 text-[#047857]" aria-hidden="true" />}
          title={t("alert.none", "No problems right now. All buses are running.")}
          description={
            lang === "hi"
              ? "वर्तमान में नेटवर्क पर कोई सक्रिय विलंब, स्किप जोखिम या रुकी बस नहीं है।"
              : "All tracked routes are running on schedule with no skip risks or delays."
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}

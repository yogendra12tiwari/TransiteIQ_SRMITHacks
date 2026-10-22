import { useState } from "react";
import { useLiveState } from "../hooks/useLiveState";
import type { Alert, AlertSeverity, AlertType } from "@transitiq/shared";

export function AlertsPage() {
  const { data } = useLiveState();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [filterType, setFilterType] = useState<string>("ALL");

  const alerts: Alert[] = data?.alerts ?? [];

  const filteredAlerts = alerts.filter((alert) => {
    if (filterType === "ALL") return true;
    return alert.type === filterType;
  });

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case "high":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
            High Severity
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Medium Severity
          </span>
        );
      case "low":
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase bg-slate-500/20 text-slate-300 border border-slate-500/30">
            Advisory
          </span>
        );
    }
  };

  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case "STALL":
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xs">
            STALL
          </div>
        );
      case "LIKELY_SKIP":
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
            SKIP
          </div>
        );
      case "GHOST_BUS":
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-xs">
            GHOST
          </div>
        );
      case "DELAY":
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
            DELAY
          </div>
        );
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto text-slate-100">
      {/* Top Bar with Language Toggle */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold text-white">
            {lang === "hi" ? "सेवा अलर्ट एवं व्यवधान" : "Service Disruptions & Alerts"}
          </h1>
          <p className="text-xs text-slate-400">
            {lang === "hi"
              ? "लखनऊ बस नेटवर्क के लाइव स्वचालित डिटेक्टर"
              : "Live automated detectors across Lucknow transit"}
          </p>
        </div>

        {/* Language switch */}
        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          <button
            onClick={() => setLang("en")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              lang === "en" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("hi")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
              lang === "hi" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {["ALL", "DELAY", "STALL", "LIKELY_SKIP", "GHOST_BUS"].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors border ${
              filterType === type
                ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                : "bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {type.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {lang === "hi" ? "सभी सेवाएं सामान्य रूप से चल रही हैं" : "All Services Operating Normally"}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {lang === "hi"
                ? "वर्तमान में लखनऊ नेटवर्क पर कोई सक्रिय विलंब या व्यवधान नहीं पाया गया है।"
                : "No active delays, stalls, skip risks, or ghost buses detected at this time."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const messageText = lang === "hi" && alert.messageHi ? alert.messageHi : alert.message;

            return (
              <div
                key={alert.id}
                data-testid={`alert-item-${alert.type}`}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-md space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(alert.type)}
                    <div>
                      <div className="text-xs font-bold text-white tracking-wide">
                        {alert.type.replace("_", " ")}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  {getSeverityBadge(alert.severity)}
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-medium">{messageText}</p>

                {alert.affectedStopIds.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">
                      {lang === "hi" ? "प्रभावित स्टॉप:" : "Affected Stops:"}
                    </span>
                    {alert.affectedStopIds.map((stopId) => (
                      <span
                        key={stopId}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {stopId}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

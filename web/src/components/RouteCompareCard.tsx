import { useState } from "react";
import type { RouteOption } from "@transitiq/shared";
import { RiskBadge } from "./RiskBadge";
import { generateTakeaway } from "@transitiq/shared";

interface RouteCompareCardProps {
  fastest?: RouteOption;
  safer?: RouteOption;
  selectedRouteId?: string;
  onSelectRoute: (option: RouteOption) => void;
  lang?: "en" | "hi";
  stopNames?: Record<string, string>;
}

export function RouteCompareCard({
  fastest,
  safer,
  selectedRouteId,
  onSelectRoute,
  lang = "en",
  stopNames = {},
}: RouteCompareCardProps) {
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStopName = (id?: string) => {
    if (!id) return "Stop";
    return stopNames[id] || id.replace(/^stop_/, "Stop ");
  };

  const takeaway = generateTakeaway(fastest, safer, lang);

  if (!fastest && !safer) {
    return null;
  }

  const renderOptionColumn = (option: RouteOption, isSafer: boolean) => {
    const isSelected = selectedRouteId === option.id;
    const isWhyOpen = !!expandedWhy[option.id];

    return (
      <div
        key={option.id}
        data-testid={`route-card-${option.label.toLowerCase()}`}
        className={`flex-1 rounded-2xl p-5 border transition-all space-y-4 ${
          isSelected
            ? "bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/40"
            : isSafer
              ? "bg-slate-800/60 border-emerald-500/40 hover:border-emerald-500/70"
              : "bg-slate-800/60 border-rose-500/30 hover:border-rose-500/60"
        }`}
      >
        {/* Header Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isSafer
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {option.label === "Safer"
                ? lang === "hi"
                  ? "🛡️ सुरक्षित विकल्प (Safer)"
                  : "🛡️ Safer Option"
                : lang === "hi"
                  ? "⚡ सबसे तेज़ (Fastest)"
                  : "⚡ Fastest Option"}
            </span>
            {option.routeName && (
              <span className="text-xs text-slate-300 font-medium">{option.routeName}</span>
            )}
          </div>

          <RiskBadge label={option.riskLabel} score={option.waitRiskScore} />
        </div>

        {/* Travel Time & Exposure Metrics */}
        <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-700/60">
          <div>
            <span className="text-[11px] text-slate-400 block">
              {lang === "hi" ? "कुल यात्रा समय" : "Total Travel Time"}
            </span>
            <div className="flex items-baseline gap-1">
              <span
                data-testid={`travel-time-${option.label.toLowerCase()}`}
                className="text-2xl font-bold font-mono text-white"
              >
                {option.travelMin}
              </span>
              <span className="text-xs text-slate-400">min</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">
              {lang === "hi" ? "असुरक्षित एक्सपोज़र" : "Exposure Minutes"}
            </span>
            <div className="flex items-baseline gap-1">
              <span
                data-testid={`exposure-time-${option.label.toLowerCase()}`}
                className={`text-2xl font-bold font-mono ${isSafer ? "text-emerald-400" : "text-rose-400"}`}
              >
                {option.exposureMinutes}
              </span>
              <span className="text-xs text-slate-400">min</span>
            </div>
          </div>
        </div>

        {/* Journey Details */}
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span>🚶</span>
              <span>{lang === "hi" ? "पैदल चलना:" : "Walk to stop:"}</span>
            </span>
            <span className="font-semibold text-slate-200">
              {option.walkMin} min ({option.walkDistanceM ?? Math.round(option.walkMin * 75)}m)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span>⏳</span>
              <span>{lang === "hi" ? "अनुमानित इंतज़ार:" : "Expected wait:"}</span>
            </span>
            <span
              data-testid={`wait-time-${option.label.toLowerCase()}`}
              className={`font-semibold ${isSafer ? "text-emerald-300" : "text-amber-300"}`}
            >
              {option.waitMin} min at {getStopName(option.boardingStopId)}
            </span>
          </div>

          {option.transferStopId && (
            <div className="flex items-center justify-between text-indigo-300">
              <span>🔄 {lang === "hi" ? "इंटरचेंज:" : "Transfer at:"}</span>
              <span className="font-semibold">{getStopName(option.transferStopId)}</span>
            </div>
          )}
        </div>

        {/* Expandable "Why?" drawer */}
        <div>
          <button
            onClick={() => toggleWhy(option.id)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <span>{isWhyOpen ? "▼" : "▶"}</span>
            <span>
              {lang === "hi" ? "स्टॉप सुरक्षा विश्लेषण देखें" : "Why this risk score & wait weight?"}
            </span>
          </button>

          {isWhyOpen && (
            <div className="mt-2 p-3 rounded-lg bg-slate-900/90 border border-slate-700 space-y-1.5 text-[11px] text-slate-300">
              <div className="font-semibold text-white flex justify-between">
                <span>{getStopName(option.boardingStopId)}</span>
                <span className="font-mono">
                  {option.riskLabel} ({option.waitRiskScore?.toFixed(3) ?? "—"})
                </span>
              </div>
              <p className="text-slate-400 text-[10px]">
                {lang === "hi"
                  ? "एक्सपोज़र = इंतज़ार मिनट × वेटिंग रिस्क वेट + पैदल मिनट × पाथ लाइटिंग वेट"
                  : "Exposure = waitMin × (0.2 + 0.8 × riskScore) + walkMin × walkRiskWeight"}
              </p>
              <div className="font-mono text-[10px] text-indigo-300">
                Formula: {option.waitMin}m × {(0.2 + 0.8 * (option.waitRiskScore ?? 0.5)).toFixed(2)} +{" "}
                {option.walkMin}m × {isSafer ? "0.25" : "0.70"} = {option.exposureMinutes} min
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onSelectRoute(option)}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            isSelected
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400"
              : isSafer
                ? "bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/50"
                : "bg-slate-700/80 hover:bg-slate-700 text-slate-200"
          }`}
        >
          <span>{isSelected ? "✓" : "→"}</span>
          <span>
            {isSelected
              ? lang === "hi"
                ? "यह मार्ग चुना गया है"
                : "Selected Route"
              : lang === "hi"
                ? "यह मार्ग चुनें"
                : `Select ${option.label}`}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Golden Contract Takeaway Banner (M4-18) */}
      {takeaway && (
        <div
          data-testid="takeaway-banner"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/50 shadow-lg flex items-center gap-3 text-sm"
        >
          <span className="text-2xl">✨</span>
          <div className="space-y-0.5">
            <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
              {lang === "hi" ? "सुरक्षा तुलना निष्कर्ष" : "Safety Comparison Takeaway"}
            </span>
            <p className="font-bold text-white text-sm sm:text-base">{takeaway}</p>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Columns (M4-17) */}
      <div className="flex flex-col sm:flex-row gap-4">
        {fastest && renderOptionColumn(fastest, false)}
        {safer && renderOptionColumn(safer, true)}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { Stop, EtaResult } from "@transitiq/shared";
import { waitRisk, formatEtaRange } from "@transitiq/shared";
import { RiskBadge } from "./RiskBadge";

export interface StopSheetProps {
  stop: Stop | null;
  onClose: () => void;
  etas: EtaResult[];
  hour?: number;
  recentReports?: number;
  lang?: "en" | "hi";
}

export function StopSheet({
  stop,
  onClose,
  etas,
  hour = 20,
  recentReports = 0,
  lang = "en",
}: StopSheetProps) {
  const [showWhyDrawer, setShowWhyDrawer] = useState(false);

  if (!stop) return null;

  // Compute expected wait from first ETA or fallback
  const firstEta = etas[0];
  const expectedWaitMin = firstEta ? firstEta.meanMin : 12;

  // Compute transparent wait risk
  const risk = waitRisk(stop, hour, expectedWaitMin, recentReports, lang);

  const factorItems = [
    {
      name: lang === "hi" ? "प्रतीक्षा समय (30%)" : "Wait Time (30%)",
      value: risk.factors.wait,
      max: 0.3,
      color: "bg-indigo-500",
    },
    {
      name: lang === "hi" ? "रात / समय कारक (20%)" : "Night / Hour (20%)",
      value: risk.factors.night,
      max: 0.2,
      color: "bg-purple-500",
    },
    {
      name: lang === "hi" ? "आसपास गतिविधि (20%)" : "Low Activity (20%)",
      value: risk.factors.lowActivity,
      max: 0.2,
      color: "bg-amber-500",
    },
    {
      name: lang === "hi" ? "सुरक्षा रिपोर्टें (20%)" : "Safety Reports (20%)",
      value: risk.factors.reports,
      max: 0.2,
      color: "bg-rose-500",
    },
    {
      name: lang === "hi" ? "शेड्यूल अनिश्चितता (10%)" : "Unreliability (10%)",
      value: risk.factors.unreliability,
      max: 0.1,
      color: "bg-blue-500",
    },
  ];

  return (
    <div
      role="dialog"
      aria-label={`Stop details for ${stop.name}`}
      className="absolute inset-x-0 bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-4 rounded-t-2xl shadow-2xl z-30 max-h-[85vh] overflow-y-auto text-slate-100 animate-in slide-in-from-bottom-4 duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{stop.name}</h2>
            <RiskBadge label={risk.label} score={risk.score} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            ID: <span className="font-mono text-slate-300">{stop.id}</span> • Lighting:{" "}
            <span className="capitalize text-slate-300">{stop.lighting}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close stop details"
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Next Buses with ETA ranges */}
      <div className="mt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {lang === "hi" ? "आने वाली बसें (लाइव ईटीए)" : "Upcoming Buses (Live ETA)"}
        </h3>
        {etas.length === 0 ? (
          <div className="p-3 rounded-lg bg-slate-800/60 text-slate-400 text-xs italic text-center">
            {lang === "hi"
              ? "अगले 30 मिनट में कोई बस निर्धारित नहीं है।"
              : "No approaching buses in the next 30 min."}
          </div>
        ) : (
          <div className="space-y-2">
            {etas.map((etaItem) => (
              <div
                key={etaItem.busId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300">
                    BUS
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{etaItem.busId}</div>
                    <div className="text-[10px] text-slate-400">80% confidence window</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {formatEtaRange(etaItem.lowMin, etaItem.highMin)}
                  </div>
                  <div className="text-[10px] text-slate-400">mean: {etaItem.meanMin}m</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* "Why?" Factor Breakdown Drawer Toggle */}
      <div className="mt-4 pt-3 border-t border-slate-800">
        <button
          onClick={() => setShowWhyDrawer(!showWhyDrawer)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-xs font-medium text-slate-300 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="font-semibold text-indigo-400">Why?</span>
            <span>Safety & Waiting Risk Factors</span>
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${showWhyDrawer ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showWhyDrawer && (
          <div
            data-testid="why-drawer-content"
            className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
          >
            <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              "{risk.explanation}"
            </p>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Risk Factor Breakdown (PRD §9.3)
              </div>
              {factorItems.map((f) => {
                const pct = Math.min(100, Math.round((f.value / f.max) * 100));
                return (
                  <div key={f.name} className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-300">
                      <span>{f.name}</span>
                      <span className="font-mono text-slate-400">
                        {f.value.toFixed(3)} / {f.max.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${f.color} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Composite Score:</span>
              <span className="font-bold text-white font-mono">{risk.score.toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

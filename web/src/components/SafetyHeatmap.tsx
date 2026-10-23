import { useState } from "react";
import { ShieldAlert, Info } from "lucide-react";
import { Card } from "./primitives/Card";

export interface HeatmapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  riskScore: number;
  safetyReportsCount: number;
  ridershipPerEvening: number;
  priorityScore: number;
}

export interface SafetyHeatmapProps {
  stops: HeatmapStop[];
  onSelectStop?: (stopId: string) => void;
  selectedStopId?: string;
}

export function SafetyHeatmap({ stops, onSelectStop, selectedStopId }: SafetyHeatmapProps) {
  const [metric, setMetric] = useState<"priority" | "reports" | "risk">("priority");

  // Determine circle color & radius based on priority/reports
  const getStopStyle = (s: HeatmapStop) => {
    let intensity = s.priorityScore; // 0..1000
    if (metric === "reports") intensity = Math.min(100, s.safetyReportsCount * 12);
    if (metric === "risk") intensity = Math.round(s.riskScore * 100);

    if (intensity >= 70) {
      return {
        color: "rgba(225, 29, 72, 0.8)", // Rose-600
        border: "#9f1239",
        radius: 28,
        label: "High Priority",
        badge: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      };
    }
    if (intensity >= 35) {
      return {
        color: "rgba(245, 158, 11, 0.7)", // Amber-500
        border: "#b45309",
        radius: 20,
        label: "Medium",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      };
    }
    return {
      color: "rgba(16, 185, 129, 0.6)", // Emerald-500
      border: "#047857",
      radius: 14,
      label: "Low",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    };
  };

  return (
    <Card className="p-4 bg-slate-900 border-slate-800 text-slate-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-base text-white">Authority Safety Incident Heatmap</h3>
            <p className="text-xs text-slate-400">
              Corroborated safety report densities and priority dispatch zones (Decision D10)
            </p>
          </div>
        </div>

        {/* Metric selector */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setMetric("priority")}
            className={`px-2.5 py-1 rounded font-medium cursor-pointer transition ${
              metric === "priority" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Priority (Risk × Ridership)
          </button>
          <button
            type="button"
            onClick={() => setMetric("reports")}
            className={`px-2.5 py-1 rounded font-medium cursor-pointer transition ${
              metric === "reports" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Reports
          </button>
          <button
            type="button"
            onClick={() => setMetric("risk")}
            className={`px-2.5 py-1 rounded font-medium cursor-pointer transition ${
              metric === "risk" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Wait Risk
          </button>
        </div>
      </div>

      {/* Heatmap Visual Grid / Zone Representation */}
      <div className="relative bg-slate-950/80 rounded-xl p-4 border border-slate-800 min-h-[260px] flex flex-col justify-between">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stops.map((stop) => {
            const style = getStopStyle(stop);
            const isSelected = selectedStopId === stop.id;

            return (
              <button
                key={stop.id}
                type="button"
                onClick={() => onSelectStop?.(stop.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/30"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: style.color, borderColor: style.border }}
                    aria-hidden="true"
                  />
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
                    {style.label}
                  </span>
                </div>

                <div className="font-bold text-sm text-white truncate">{stop.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <span>Reports: </span>
                  <strong className="text-slate-200">{stop.safetyReportsCount}</strong>
                  <span className="mx-1">•</span>
                  <span>Risk: </span>
                  <strong className="text-slate-200">{stop.riskScore.toFixed(2)}</strong>
                </div>
              </button>
            );
          })}
        </div>

        {/* Anti-stigma note (PRD §2 Decision D10) */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 mt-4">
          <Info className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
          <span>
            <strong>Anti-Stigma Policy:</strong> This heatmap is restricted strictly to transport corporation
            and police oversight dashboards. Commuters see only objective per-stop waiting conditions, never
            area rankings.
          </span>
        </div>
      </div>
    </Card>
  );
}

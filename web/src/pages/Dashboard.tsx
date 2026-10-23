import { useState, useMemo } from "react";
import { useLiveState } from "../hooks/useLiveState";
import { PriorityTable, type PriorityStopRow } from "../components/PriorityTable";
import { WaitByHourChart } from "../components/WaitByHourChart";
import { ReviewQueue } from "../components/ReviewQueue";
import { SystemHealthCard } from "../components/SystemHealthCard";

const PROMPT_VERSIONS = ["triageReport.v1.md", "explainRisk.v1.md", "recommendActions.v1.md"];

const INITIAL_PRIORITY_STOPS: PriorityStopRow[] = [
  {
    stopId: "stop_A",
    stopName: "Stop A (Hazratganj)",
    avgEveningWaitMin: 18,
    safetyReportsCount: 7,
    riskBand: "high",
    recommendedAction: "Add 20:15 departure; upgrade high-mast lighting and deploy transit marshals",
    ridershipPerEvening: 420,
  },
  {
    stopId: "stop_B",
    stopName: "Stop B (Charbagh)",
    avgEveningWaitMin: 4,
    safetyReportsCount: 1,
    riskBand: "low",
    recommendedAction: "Maintain 8-min headway; monitor footbridge egress",
    ridershipPerEvening: 680,
  },
  {
    stopId: "stop_C",
    stopName: "Stop C (Alambagh)",
    avgEveningWaitMin: 11,
    safetyReportsCount: 3,
    riskBand: "medium",
    recommendedAction: "Investigate bus bunching on Corridor 10; improve shelter visibility",
    ridershipPerEvening: 310,
  },
  {
    stopId: "stop_D",
    stopName: "Stop D (Polytechnic)",
    avgEveningWaitMin: 14,
    safetyReportsCount: 4,
    riskBand: "medium",
    recommendedAction: "Schedule additional feeder trip at 21:00; replace unlit corner fixture",
    ridershipPerEvening: 290,
  },
];

export function DashboardPage() {
  const { data: liveData } = useLiveState();
  const [selectedStopId, setSelectedStopId] = useState<string>("stop_A");

  const selectedStop = useMemo(
    () => INITIAL_PRIORITY_STOPS.find((s) => s.stopId === selectedStopId) ?? INITIAL_PRIORITY_STOPS[0],
    [selectedStopId],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Transit Authority Safety &amp; Operations Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              RESTRICTED
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time community safety signals, dispatch interventions, and infrastructure prioritization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Network status: <strong className="text-emerald-400">Live</strong>
          </span>
          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-md border border-slate-700 font-mono">
            Lucknow Urban Transit
          </span>
        </div>
      </div>

      {/* KPI Summary Row (PRD §10.4) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Avg Evening Wait</span>
          <div className="text-2xl font-extrabold text-white mt-1">
            14.2 <span className="text-sm font-normal text-slate-400">min</span>
          </div>
          <span className="text-[11px] text-amber-400 mt-1 block">+4.2 min above 10m target</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Delayed Buses Now</span>
          <div className="text-2xl font-extrabold text-white mt-1">
            {liveData?.alerts.filter((a) => a.type === "DELAY").length ?? 1}
          </div>
          <span className="text-[11px] text-rose-400 mt-1 block">Corridor 10: Bus 23 delayed 7m</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Safety Reports (30d)</span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">12</div>
          <span className="text-[11px] text-slate-400 mt-1 block">7 at Stop A &bull; 3 lighting fixes</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-medium">Ghost-Bus Rate</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">2.1%</div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">Well within 5% SLA threshold</span>
        </div>
      </div>

      {/* Authority Priority Table (PRD §10.4, M6-32) */}
      <PriorityTable
        stops={INITIAL_PRIORITY_STOPS}
        selectedStopId={selectedStopId}
        onSelectStop={setSelectedStopId}
      />

      {/* Grid: Hourly Wait Chart & Human Review Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WaitByHourChart stopName={selectedStop?.stopName ?? "Stop A (Hazratganj)"} />
        <ReviewQueue />
      </div>

      {/* System Integrity & Model Health Card (M6-36) */}
      <SystemHealthCard />

      {/* Footer with Active Prompt Versions (M6-37) */}
      <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-2">
          <span>Active Genkit Prompts:</span>
          {PROMPT_VERSIONS.map((v) => (
            <code key={v} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              {v}
            </code>
          ))}
        </div>
        <div>TransitIQ Operator Operations &bull; Ethical Transit Intelligence</div>
      </div>
    </div>
  );
}

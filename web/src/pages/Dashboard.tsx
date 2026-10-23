import { useState, useMemo } from "react";
import { useLiveState } from "../hooks/useLiveState";
import { useNetwork } from "../hooks/useNetwork";
import { PriorityTable, type PriorityStopRow } from "../components/PriorityTable";
import { WaitByHourChart } from "../components/WaitByHourChart";
import { SafetyHeatmap } from "../components/SafetyHeatmap";
import { FleetMonitoring } from "../components/FleetMonitoring";
import { IncidentManagement } from "../components/IncidentManagement";
import { TrendsAnalytics } from "../components/TrendsAnalytics";
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
  const { routes, stops } = useNetwork();
  const [activeTab, setActiveTab] = useState<"stops" | "fleet" | "incidents" | "trends" | "system">("stops");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string>("stop_A");

  const selectedStop = useMemo(
    () => INITIAL_PRIORITY_STOPS.find((s) => s.stopId === selectedStopId) ?? INITIAL_PRIORITY_STOPS[0],
    [selectedStopId],
  );

  const heatmapStops = useMemo(() => {
    return INITIAL_PRIORITY_STOPS.map((s) => {
      const match = stops.find((st) => st.id === s.stopId);
      const riskScore = s.riskBand === "high" ? 0.795 : s.riskBand === "medium" ? 0.48 : 0.325;
      const priorityScore = Math.round((s.ridershipPerEvening * riskScore) / 10);
      return {
        id: s.stopId,
        name: s.stopName,
        lat: match?.lat ?? 26.85,
        lng: match?.lng ?? 80.96,
        riskScore,
        safetyReportsCount: s.safetyReportsCount,
        ridershipPerEvening: s.ridershipPerEvening,
        priorityScore,
      };
    });
  }, [stops]);

  const buses = liveData?.buses ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
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

      {/* 5-Tab Navigation Bar (Architecture §1.1) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("stops")}
          className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition ${
            activeTab === "stops"
              ? "bg-[#0F5BD8] text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          1. Stops Priority
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fleet")}
          className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition ${
            activeTab === "fleet"
              ? "bg-[#0F5BD8] text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          2. Fleet &amp; Delays
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("incidents")}
          className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition ${
            activeTab === "incidents"
              ? "bg-[#0F5BD8] text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          3. Incidents &amp; Review
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("trends")}
          className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition ${
            activeTab === "trends"
              ? "bg-[#0F5BD8] text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          4. Trends &amp; Export
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("system")}
          className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition ${
            activeTab === "system"
              ? "bg-[#0F5BD8] text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          5. System Health
        </button>
      </div>

      {/* Tab 1: Stops Priority & Safety Heatmap */}
      {activeTab === "stops" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Priority Stop Ranking &amp; Interventions</h2>
            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                showHeatmap
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              {showHeatmap ? "Hide Safety Heatmap" : "Toggle Safety Heatmap (D10)"}
            </button>
          </div>

          {showHeatmap && (
            <SafetyHeatmap
              stops={heatmapStops}
              selectedStopId={selectedStopId}
              onSelectStop={setSelectedStopId}
            />
          )}

          <PriorityTable
            stops={INITIAL_PRIORITY_STOPS}
            selectedStopId={selectedStopId}
            onSelectStop={setSelectedStopId}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WaitByHourChart stopName={selectedStop?.stopName ?? "Stop A (Hazratganj)"} />
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
                Operational Recommendation (Genkit &bull; explainRisk.v1)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                &ldquo;Stop A shows high evening risk (0.79) driven by an 18-minute expected wait and 7
                corroborated safety reports. Adding a 20:15 departure on Route 23 reduces average outdoor
                waiting to 7 min. Immediate street-lighting repairs recommended.&rdquo;
              </p>
              <div className="text-[11px] text-slate-400">
                Confidence: <strong>High (0.88)</strong> &bull; Corroborated with municipal utility ticket
                #LK-4921
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Fleet & Delays */}
      {activeTab === "fleet" && <FleetMonitoring buses={buses} routes={routes} stops={stops} />}

      {/* Tab 3: Incidents & Review */}
      {activeTab === "incidents" && <IncidentManagement />}

      {/* Tab 4: Trends & Export */}
      {activeTab === "trends" && <TrendsAnalytics routes={routes} />}

      {/* Tab 5: System Health */}
      {activeTab === "system" && (
        <div className="space-y-6">
          <SystemHealthCard />
        </div>
      )}

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

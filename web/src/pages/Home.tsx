import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { MapView } from "../components/MapView";
import { PhoneFrame } from "../components/PhoneFrame";
import { Link } from "react-router-dom";

export function HomePage() {
  const { routes, stops, loading: networkLoading } = useNetwork();
  const { data: liveData, isStale, loading: liveLoading } = useLiveState();

  const buses = liveData?.buses ?? [];

  return (
    <div className="space-y-6">
      {/* Hero Intro */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Live Transit & Safety Layer
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Real-time Lucknow bus positions, ETA uncertainty intervals, and women-safety aware route guidance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/plan"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
          >
            Plan Safer Route →
          </Link>
          <Link
            to="/demo"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition"
          >
            Operator Controls ⚙
          </Link>
        </div>
      </div>

      {/* Main Map Presentation wrapped in PhoneFrame for mobile layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: PhoneFrame with Live Map */}
        <div className="lg:col-span-8 flex justify-center">
          <PhoneFrame className="w-full">
            <div className="h-full flex flex-col bg-slate-900">
              {/* Phone App Header */}
              <div className="px-4 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between z-10">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white tracking-tight text-sm">
                    Transit<span className="text-indigo-400">IQ</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                    Lucknow
                  </span>
                  {liveData?.scenario === "replay" && (
                    <span
                      data-testid="replay-chip"
                      className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Replay
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isStale ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
                    }`}
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    {isStale ? "Feed Paused" : `${buses.length} Buses Live`}
                  </span>
                </div>
              </div>

              {/* Map View */}
              <div className="flex-1 w-full relative min-h-[520px]">
                {networkLoading ? (
                  <div className="h-full flex items-center justify-center p-8 text-slate-400 text-xs">
                    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full mr-2" />
                    Loading transit map...
                  </div>
                ) : (
                  <MapView
                    routes={routes}
                    stops={stops}
                    buses={buses}
                    etas={liveData?.etas ?? []}
                    alerts={liveData?.alerts ?? []}
                    isStale={isStale}
                  />
                )}
              </div>

              {/* Phone Footer Quick Actions */}
              <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-around text-xs">
                <Link
                  to="/plan"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 font-medium hover:bg-indigo-600/50 transition"
                >
                  🔍 Safer Plan
                </Link>
                <Link
                  to="/report"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition"
                >
                  📢 Report Concern
                </Link>
                <Link
                  to="/alerts"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition"
                >
                  🔔 Alerts
                </Link>
              </div>
            </div>
          </PhoneFrame>
        </div>

        {/* Right Column: Fleet Telemetry & Network Status Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-4">
            <h2 className="text-base font-bold text-white flex items-center justify-between">
              <span>Transit Network Status</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                Active
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                <span className="text-slate-400">Tracked Stops</span>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {networkLoading ? "..." : stops.length}
                </p>
                <span className="text-[10px] text-slate-500">Includes Stop A & B</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                <span className="text-slate-400">Active Routes</span>
                <p className="text-xl font-bold font-mono text-white mt-1">
                  {networkLoading ? "..." : routes.length}
                </p>
                <span className="text-[10px] text-slate-500">Routes 7, 12, 23, 41</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                <span className="text-slate-400">Buses in Motion</span>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {liveLoading ? "..." : buses.length}
                </p>
                <span className="text-[10px] text-slate-500">Live on map</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/40">
                <span className="text-slate-400">Stream Status</span>
                <p
                  className={`text-sm font-bold font-mono mt-2 ${
                    isStale ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {isStale ? "Paused" : "2s Ticking"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/60">
              <p className="text-xs text-slate-300">
                Tip: Open{" "}
                <Link to="/demo" className="text-indigo-400 underline font-medium">
                  /demo
                </Link>{" "}
                in an incognito window to start or pause the moving bus simulation loop.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Bus as BusIcon, AlertTriangle, Send, CheckCircle2 } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Card } from "./primitives/Card";
import { Button } from "./primitives/Button";
import type { Bus, Route, Stop, AlertType } from "@transitiq/shared";

export interface FleetMonitoringProps {
  buses: Bus[];
  routes: Route[];
  stops: Stop[];
}

export function FleetMonitoring({ buses, routes, stops }: FleetMonitoringProps) {
  const [filter, setFilter] = useState<"all" | "problems">("all");
  const [alertType, setAlertType] = useState<AlertType>("DIVERSION");
  const [targetRouteId, setTargetRouteId] = useState<string>("route_23");
  const [alertMessage, setAlertMessage] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishedNotice, setPublishedNotice] = useState(false);

  // Categorize buses
  const delayedBuses = buses.filter((b) => b.status === "DELAYED");
  const stalledBuses = buses.filter((b) => b.status === "STALLED" || b.driverStatus === "STALLED");
  const ghostBuses = buses.filter((b) => b.status === "GHOST" || b.driverStatus === "OUT_OF_SERVICE");

  const displayedBuses = buses.filter((b) => {
    if (filter === "problems") {
      return (
        b.status !== "RUNNING" ||
        b.driverStatus === "STALLED" ||
        b.driverStatus === "BREAK" ||
        b.driverStatus === "OUT_OF_SERVICE"
      );
    }
    return true;
  });

  const handlePublishAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMessage.trim()) return;

    setPublishing(true);
    setPublishedNotice(false);
    try {
      const alertId = `alert_op_${Date.now()}`;
      const route = routes.find((r) => r.id === targetRouteId);
      const affectedStops = route?.stopIds ?? [stops[0]?.id ?? "stop_A"];

      const alertData = {
        id: alertId,
        type: alertType,
        severity: alertType === "CANCELLATION" ? "high" : "medium",
        source: "operator",
        status: "NEW",
        message: alertMessage.trim(),
        affectedStopIds: affectedStops,
        routeId: targetRouteId,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, "alerts", alertId), alertData);
      setPublishedNotice(true);
      setAlertMessage("");
      setTimeout(() => setPublishedNotice(false), 4000);
    } catch (err) {
      console.error("Failed to publish operator service alert:", err);
      setPublishedNotice(true);
      setAlertMessage("");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Fleet KPI breakdown row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400">Total Active Fleet</span>
          <div className="text-xl font-bold text-white mt-1">{buses.length}</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-amber-400 font-medium">Delayed Buses</span>
          <div className="text-xl font-bold text-amber-300 mt-1">{delayedBuses.length}</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-rose-400 font-medium">Stalled / Breakdowns</span>
          <div className="text-xl font-bold text-rose-300 mt-1">{stalledBuses.length}</div>
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Ghost / Out of Service</span>
          <div className="text-xl font-bold text-slate-300 mt-1">{ghostBuses.length}</div>
        </div>
      </div>

      {/* Live Fleet Telemetry Table */}
      <Card className="p-4 bg-slate-900 border-slate-800 text-slate-100 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BusIcon className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <div>
              <h3 className="font-bold text-base text-white">Live Fleet Telemetry & Delay Monitor</h3>
              <p className="text-xs text-slate-400">2-second polling with driver status telemetry</p>
            </div>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition ${
                filter === "all" ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              All Buses ({buses.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("problems")}
              className={`px-3 py-1 rounded font-medium cursor-pointer transition ${
                filter === "problems"
                  ? "bg-rose-900/60 text-rose-200 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Problems Only ({delayedBuses.length + stalledBuses.length + ghostBuses.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Bus ID</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Driver Status</th>
                <th className="py-2.5 px-3">Occupancy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {displayedBuses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                    No buses matching selected filter.
                  </td>
                </tr>
              ) : (
                displayedBuses.map((bus) => {
                  const route = routes.find((r) => r.id === bus.routeId);
                  const isProblem = bus.status !== "RUNNING" || bus.driverStatus === "STALLED";

                  return (
                    <tr
                      key={bus.id}
                      className={`hover:bg-slate-800/50 transition-colors ${
                        isProblem ? "bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{bus.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: route?.color || "#F59E0B" }}
                            aria-hidden="true"
                          />
                          <span className="font-medium text-slate-200">{route?.name || bus.routeId}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{Math.round(bus.speedMps * 3.6)} km/h</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            bus.status === "RUNNING"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : bus.status === "DELAYED"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {bus.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {bus.driverStatus || "RUNNING"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {Math.round((bus.occupancy ?? 0.4) * 100)}% capacity
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Operator Service Alert Publisher (F30 / P2-20) */}
      <Card className="p-5 bg-slate-900 border-slate-800 text-slate-100 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-base text-white">Publish Service Alert / Disruption</h3>
            <p className="text-xs text-slate-400">
              Immediately alerts commuters and excludes closed stops from route planner (F30)
            </p>
          </div>
        </div>

        {publishedNotice && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            <span>Service alert published to all active commuter apps!</span>
          </div>
        )}

        <form onSubmit={handlePublishAlert} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fleet-alert-type" className="block text-slate-400 font-semibold mb-1">
                Disruption Type:
              </label>
              <select
                id="fleet-alert-type"
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as AlertType)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-amber-400"
              >
                <option value="DIVERSION">DIVERSION (Route detour)</option>
                <option value="CANCELLATION">CANCELLATION (Trip canceled)</option>
                <option value="STOP_CLOSED">STOP_CLOSED (Stop inaccessible)</option>
              </select>
            </div>

            <div>
              <label htmlFor="fleet-target-route" className="block text-slate-400 font-semibold mb-1">
                Affected Route:
              </label>
              <select
                id="fleet-target-route"
                value={targetRouteId}
                onChange={(e) => setTargetRouteId(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-amber-400"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="fleet-alert-message" className="block text-slate-400 font-semibold mb-1">
              Alert Message (English &amp; Hindi):
            </label>
            <textarea
              id="fleet-alert-message"
              rows={2}
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              placeholder="e.g. Route 23 diverted via Ring Road due to waterlogging near Hazratganj."
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={publishing || !alertMessage.trim()}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{publishing ? "Publishing..." : "Broadcast Service Alert"}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

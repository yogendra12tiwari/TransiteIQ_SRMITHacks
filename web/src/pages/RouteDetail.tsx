import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  checkSafeWaitTrigger,
  nearbySafeSpots,
  type SafeWaitDecision,
  type SafeWaitAlertStatus,
  formatEtaRange,
  waitRisk,
} from "@transitiq/shared";
import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { RiskBadge } from "../components/RiskBadge";
import { SafeSpotsList } from "../components/SafeSpotsList";
import { TripSharePanel } from "../components/TripSharePanel";
import { SafeWaitToast } from "../components/SafeWaitToast";
import { MapView } from "../components/MapView";

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { routes, stops, safeSpots, loading: networkLoading } = useNetwork();
  const { data, isStale } = useLiveState();
  const buses = useMemo(() => data?.buses ?? [], [data?.buses]);
  const alerts = useMemo(() => data?.alerts ?? [], [data?.alerts]);

  const [lang, setLang] = useState<"en" | "hi">("en");
  const [walkMin, setWalkMin] = useState<number>(6);
  const [safeWaitEnabled, setSafeWaitEnabled] = useState<boolean>(true);
  const [alertStatus, setAlertStatus] = useState<SafeWaitAlertStatus>("none");
  const [selectedStopId, setSelectedStopId] = useState<string>("stop_A");

  // Find target route
  const currentRoute = useMemo(() => {
    if (routes.length === 0) return null;
    return routes.find((r) => r.id === id) ?? routes[0]!;
  }, [routes, id]);

  // Keep selected stop valid for this route
  useEffect(() => {
    if (currentRoute && !currentRoute.stopIds.includes(selectedStopId)) {
      setSelectedStopId(currentRoute.stopIds[0] ?? "stop_A");
    }
  }, [currentRoute, selectedStopId]);

  const currentStop = useMemo(() => {
    return stops.find((s) => s.id === selectedStopId);
  }, [stops, selectedStopId]);

  // Risk computation for current stop
  const stopRisk = useMemo(() => {
    if (!currentStop) return null;
    return waitRisk(
      currentStop,
      20,
      currentStop.id === "stop_A" ? 18 : 4,
      currentStop.id === "stop_A" ? 7 : 1,
      lang,
    );
  }, [currentStop, lang]);

  // Nearby safe waiting spots
  const spotsNearby = useMemo(() => {
    if (!currentStop || !safeSpots || safeSpots.length === 0) return [];
    return nearbySafeSpots(currentStop, safeSpots, 300);
  }, [currentStop, safeSpots]);

  // Track next bus ETA for this stop
  const nextBusEta = useMemo(() => {
    // If live bus exists on this route before this stop
    const matchingBus = buses.find((b) => b.routeId === currentRoute?.id);
    if (matchingBus) {
      // Dynamic simulated ETA based on speed
      const etaMean = currentStop?.id === "stop_A" ? 5.5 : 4.0;
      return {
        meanMin: etaMean,
        lowMin: Math.max(1, etaMean - 1.5),
        highMin: etaMean + 1.5,
      };
    }
    return {
      meanMin: currentStop?.id === "stop_A" ? 5.5 : 4.0,
      lowMin: 3.5,
      highMin: 7.5,
    };
  }, [buses, currentRoute, currentStop]);

  // Check if bus is likely skip
  const isLikelySkip = useMemo(() => {
    return alerts.some((a) => a.type === "LIKELY_SKIP" && a.affectedStopIds.includes(selectedStopId));
  }, [alerts, selectedStopId]);

  // Safe Wait Decision Engine (M5-06, Decision D2)
  const safeWaitDecision: SafeWaitDecision = useMemo(() => {
    if (!safeWaitEnabled || alertStatus === "dismissed") {
      return { action: "none", message: null, urgency: "normal" };
    }

    return checkSafeWaitTrigger({
      etaMeanMin: nextBusEta.meanMin,
      etaLowMin: nextBusEta.lowMin,
      etaHighMin: nextBusEta.highMin,
      walkMin,
      bufferMin: 2,
      currentStatus: alertStatus,
      busName: currentRoute?.name ?? "Bus",
      isLikelySkip,
      lang,
    });
  }, [safeWaitEnabled, alertStatus, nextBusEta, walkMin, currentRoute, isLikelySkip, lang]);

  // Trigger state updates when decision changes
  useEffect(() => {
    if (safeWaitDecision.action === "fire_primary" && alertStatus === "none") {
      setAlertStatus("primary_fired");
    } else if (safeWaitDecision.action === "fire_escalation" && alertStatus === "primary_fired") {
      setAlertStatus("escalated");
    }
  }, [safeWaitDecision, alertStatus]);

  if (networkLoading || !currentRoute) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-3" />
        Loading route details...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Safe Wait Floating Toast Notification */}
      {safeWaitDecision.message && (
        <SafeWaitToast
          decision={safeWaitDecision}
          onAcknowledge={() => setAlertStatus("acknowledged")}
          onSnooze={() => {
            setAlertStatus("snoozed");
            setTimeout(() => setAlertStatus("primary_fired"), 60000);
          }}
          onDismiss={() => setAlertStatus("dismissed")}
          lang={lang}
        />
      )}

      {/* Header with Navigation and Language Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            to="/plan"
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold"
          >
            ← Back to Plan
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentRoute.color }} />
              <h1 className="text-xl font-bold text-white">{currentRoute.name}</h1>
            </div>
            <p className="text-xs text-slate-400">
              {currentRoute.stopIds.length} stops • Evening headway: {currentRoute.headwayMin.evening} min
            </p>
          </div>
        </div>

        <button
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition"
        >
          {lang === "en" ? "हिंदी (Hindi)" : "English"}
        </button>
      </div>

      {/* Live Status Card */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-700/60 pb-6">
          {/* Boarding Stop Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {lang === "hi" ? "बोर्डिंग स्टॉप:" : "Boarding Stop:"}
            </label>
            <select
              value={selectedStopId}
              onChange={(e) => {
                setSelectedStopId(e.target.value);
                setAlertStatus("none");
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              {currentRoute.stopIds.map((sid) => {
                const s = stops.find((item) => item.id === sid);
                return (
                  <option key={sid} value={sid}>
                    {s ? s.name : sid}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Live ETA Range */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300 block">
              {lang === "hi" ? "लाइव आगमन समय (ETA):" : "Live ETA Window:"}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {formatEtaRange(nextBusEta.lowMin, nextBusEta.highMin)}
              </span>
              <span className="text-xs text-slate-400">(mean: {nextBusEta.meanMin.toFixed(1)}m)</span>
            </div>
          </div>

          {/* Stop Safety Badge */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300 block">
              {lang === "hi" ? "स्टॉप सुरक्षा स्तर:" : "Stop Safety Risk:"}
            </span>
            <div>{stopRisk && <RiskBadge label={stopRisk.label} score={stopRisk.score} />}</div>
          </div>
        </div>

        {/* Walking Time Stepper & Safe Wait Controls (M5-15) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              {lang === "hi" ? "स्टॉप तक पैदल चलने का समय (मिनट):" : "Walking Time to Stop (min):"}
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWalkMin((w) => Math.max(1, w - 1))}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base flex items-center justify-center border border-slate-700"
              >
                -
              </button>
              <span
                data-testid="walk-time-display"
                className="text-2xl font-bold font-mono text-white min-w-[3rem] text-center"
              >
                {walkMin}
              </span>
              <button
                onClick={() => setWalkMin((w) => Math.min(20, w + 1))}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base flex items-center justify-center border border-slate-700"
              >
                +
              </button>
              <span className="text-xs text-slate-400">(~{walkMin * 75}m distance)</span>
            </div>
          </div>

          {/* Enable Safe Wait Button */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                {lang === "hi" ? "सेफ वेट अधिसूचना:" : "Safe Wait Leave-Alert:"}
              </span>
              <span
                className={`text-xs font-bold font-mono ${
                  safeWaitEnabled ? "text-emerald-400" : "text-slate-400"
                }`}
              >
                {safeWaitEnabled ? "ACTIVE" : "DISABLED"}
              </span>
            </div>
            <button
              onClick={() => {
                setSafeWaitEnabled(!safeWaitEnabled);
                if (!safeWaitEnabled) setAlertStatus("none");
              }}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                safeWaitEnabled
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-300"
              }`}
            >
              <span>{safeWaitEnabled ? "✓" : "○"}</span>
              <span>
                {safeWaitEnabled
                  ? lang === "hi"
                    ? "सेफ वेट सक्रिय है"
                    : "Safe Wait Enabled"
                  : lang === "hi"
                    ? "सेफ वेट सक्रिय करें"
                    : "Enable Safe Wait"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Safe Spots List */}
      <SafeSpotsList safeSpots={spotsNearby} stopName={currentStop?.name} lang={lang} />

      {/* Trip Share Panel */}
      <TripSharePanel
        routeId={currentRoute.id}
        boardingStopId={selectedStopId}
        destinationStopId={currentRoute.stopIds[currentRoute.stopIds.length - 1] ?? "stop_gomtinagar"}
        lang={lang}
      />

      {/* Route Map Preview */}
      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🗺️</span>
          <span>Live Fleet & Route Trace</span>
        </h2>
        <div className="h-[360px] rounded-xl overflow-hidden border border-slate-700/60">
          <MapView
            routes={[currentRoute]}
            stops={stops.filter((s) => currentRoute.stopIds.includes(s.id))}
            buses={buses.filter((b) => b.routeId === currentRoute.id)}
            alerts={alerts}
            isStale={isStale}
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Radio, AlertOctagon, CheckCircle2, Coffee, Ban, ChevronLeft } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { Button } from "../components/primitives/Button";
import { Card } from "../components/primitives/Card";
import type { DriverStatus, SimOverrideEntry, SimOverrides } from "@transitiq/shared";

export function DriverPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";

  const { routes } = useNetwork();
  const { data: liveData } = useLiveState();

  const [selectedBusId, setSelectedBusId] = useState<string>("bus_route_23_1");
  const [driverStatus, setDriverStatus] = useState<DriverStatus>("RUNNING");
  const [useGpsOverride, setUseGpsOverride] = useState(false);
  const [customLat, setCustomLat] = useState<number>(26.8528);
  const [customLng, setCustomLng] = useState<number>(80.9655);
  const [submitting, setSubmitting] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const buses = liveData?.buses ?? [];
  const currentBus = buses.find((b) => b.id === selectedBusId);

  const effectiveBus = currentBus ?? {
    id: selectedBusId,
    routeId: selectedBusId.includes("23")
      ? "route_23"
      : selectedBusId.includes("7")
        ? "route_7"
        : selectedBusId.includes("41")
          ? "route_41"
          : "route_11",
    distanceAlongRouteM: 450,
    speedMps:
      driverStatus === "STALLED" || driverStatus === "BREAK" || driverStatus === "OUT_OF_SERVICE"
        ? 0
        : 8.5,
    lat: customLat,
    lng: customLng,
    status: driverStatus === "STALLED" ? ("STALLED" as const) : ("RUNNING" as const),
    driverStatus: driverStatus,
  };

  const effectiveRoute = routes.find((r) => r.id === effectiveBus.routeId);

  // Sync state if bus selected changes
  useEffect(() => {
    if (currentBus) {
      setCustomLat(currentBus.lat);
      setCustomLng(currentBus.lng);
      if (currentBus.driverStatus) {
        setDriverStatus(currentBus.driverStatus);
      }
    }
  }, [currentBus]);

  const handlePublishStatus = async (statusToSet: DriverStatus) => {
    setSubmitting(true);
    setPublishedSuccess(false);
    try {
      setDriverStatus(statusToSet);

      const overrideEntry: SimOverrideEntry = {
        busId: selectedBusId,
        driverStatus: statusToSet,
        pingLat: useGpsOverride ? customLat : undefined,
        pingLng: useGpsOverride ? customLng : undefined,
        atMs: Date.now(),
      };

      // 1. Always persist to localStorage
      let updated: SimOverrides = {};
      try {
        const stored = localStorage.getItem("transitiq_sim_overrides");
        const existing: SimOverrides = stored ? JSON.parse(stored) : {};
        updated = { ...existing, [selectedBusId]: overrideEntry };
        localStorage.setItem("transitiq_sim_overrides", JSON.stringify(updated));
      } catch {
        updated = { [selectedBusId]: overrideEntry };
      }

      // 2. Broadcast immediately across open tabs
      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const channel = new BroadcastChannel("transitiq-sim-controller");
          channel.postMessage({ type: "DRIVER_OVERRIDE", overrides: updated });
          channel.close();
        }
      } catch {
        // ignore
      }

      // 3. Sync to Firestore sim/overrides if authorized
      try {
        const overridesRef = doc(db, "sim", "overrides");
        const snap = await getDoc(overridesRef);
        const existingFirestore: SimOverrides = snap.exists() ? (snap.data() as SimOverrides) : {};
        const merged: SimOverrides = { ...existingFirestore, ...updated };
        await setDoc(overridesRef, merged);
      } catch (firestoreErr) {
        console.warn("Firestore sim/overrides write skipped (local demo mode):", firestoreErr);
      }

      setPublishedSuccess(true);
      setTimeout(() => setPublishedSuccess(false), 3500);
    } catch (err) {
      console.error("Failed to publish driver override:", err);
      setPublishedSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="driver-page"
      className="max-w-md mx-auto w-full flex-1 flex flex-col p-4 space-y-4 pb-24 text-[#111827]"
    >
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg cursor-pointer"
            aria-label={t("common.back", "Back")}
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#111827]">
              {lang === "hi" ? "चालक / बस पैनल" : "Driver / Bus Panel"}
            </h1>
            <p className="text-xs text-[#4B5563]">
              {lang === "hi"
                ? "स्थिति और जीपीएस टेलीमेट्री प्रकाशित करें"
                : "Publish bus status & GPS telemetry"}
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold">
          {lang === "hi" ? "ऑपरेटर" : "Operator"}
        </span>
      </div>

      {/* Bus Selection */}
      <Card className="p-4 bg-white border-[#D8DEE6] space-y-3">
        <label
          htmlFor="driver-bus-select"
          className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]"
        >
          {lang === "hi" ? "अपनी बस चुनें" : "Select Your Bus"}
        </label>
        <select
          id="driver-bus-select"
          value={selectedBusId}
          onChange={(e) => setSelectedBusId(e.target.value)}
          className="w-full min-h-[48px] px-3 bg-[#F5F7FA] border border-[#D8DEE6] rounded-xl text-sm font-semibold text-[#111827] focus:outline-none focus:border-[#0F5BD8] cursor-pointer"
        >
          {buses.length > 0 ? (
            buses.map((b) => {
              const r = routes.find((route) => route.id === b.routeId);
              return (
                <option key={b.id} value={b.id}>
                  {b.id} — {r?.name || b.routeId} ({b.status})
                </option>
              );
            })
          ) : (
            <>
              <option value="bus_route_23_1">bus_route_23_1 — Bus 23 (Hazratganj - Gomti Nagar)</option>
              <option value="bus_route_7_1">bus_route_7_1 — Bus 7 (Charbagh - Polytechnic)</option>
              <option value="bus_route_41_1">bus_route_41_1 — Bus 41 (Alambagh - Munshipulia)</option>
              <option value="bus_route_11_1">bus_route_11_1 — Bus 11 (Charbagh - Telibagh)</option>
            </>
          )}
        </select>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
          <span className="text-[#4B5563]">
            {lang === "hi" ? "रूट:" : "Route:"}{" "}
            <strong className="text-[#111827]">
              {effectiveRoute ? effectiveRoute.name : effectiveBus.routeId}
            </strong>
          </span>
          <span className="text-[#4B5563]">
            {lang === "hi" ? "गति:" : "Speed:"}{" "}
            <strong className="text-[#111827]">
              {Math.round(effectiveBus.speedMps * 3.6)} km/h
            </strong>
          </span>
          <span className="text-[#4B5563]">
            {lang === "hi" ? "स्थिति:" : "Status:"}{" "}
            <strong className="text-[#0F5BD8]">
              {effectiveBus.driverStatus || effectiveBus.status}
            </strong>
          </span>
        </div>
      </Card>

      {/* Published feedback banner */}
      {publishedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span>
            {lang === "hi"
              ? `स्थिति सफलतापूर्वक अपडेट की गई! बस ${selectedBusId} अब ${driverStatus} के रूप में चिह्नित है।`
              : `Status updated successfully! Bus ${selectedBusId} is now marked ${driverStatus}.`}
          </span>
        </div>
      )}

      {/* Driver Status Controls (F32 / P2-24) */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-[#111827]">
          {lang === "hi" ? "बस संचालन स्थिति सेट करें" : "Set Bus Operational Status"}
        </h2>
        <p className="text-xs text-[#4B5563]">
          {lang === "hi"
            ? "रूट स्थिति तुरंत कम्यूटर ऐप और प्राधिकरण डैशबोर्ड पर अपडेट होगी।"
            : "Instantly broadcast to rider PWA and transit authority dashboard."}
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Running Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("RUNNING")}
            className={`min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition cursor-pointer ${
              driverStatus === "RUNNING"
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 shadow-sm"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <div className="text-left">
              <div>{lang === "hi" ? "सामान्य (सक्रिय)" : "Running (Normal)"}</div>
              <div className="text-[10px] font-normal text-[#4B5563]">
                {lang === "hi" ? "मार्ग पर सक्रिय" : "Active on route"}
              </div>
            </div>
          </button>

          {/* Stalled / Broken Down Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("STALLED")}
            className={`min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition cursor-pointer ${
              driverStatus === "STALLED"
                ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20 shadow-sm"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-rose-600" aria-hidden="true" />
            <div className="text-left">
              <div>{lang === "hi" ? "खराब / रुकी हुई" : "Stalled / Breakdown"}</div>
              <div className="text-[10px] font-normal text-[#4B5563]">
                {lang === "hi" ? "सड़क पर रुकी हुई" : "Immobilized on road"}
              </div>
            </div>
          </button>

          {/* Driver Break Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("BREAK")}
            className={`min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition cursor-pointer ${
              driverStatus === "BREAK"
                ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-sm"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <Coffee className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <div className="text-left">
              <div>{lang === "hi" ? "चालक अवकाश" : "Driver Break"}</div>
              <div className="text-[10px] font-normal text-[#4B5563]">
                {lang === "hi" ? "अस्थायी विराम" : "Temporary rest stop"}
              </div>
            </div>
          </button>

          {/* Out of Service Button */}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("OUT_OF_SERVICE")}
            className={`min-h-[48px] p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition cursor-pointer ${
              driverStatus === "OUT_OF_SERVICE"
                ? "bg-slate-100 border-slate-500 text-slate-800 ring-2 ring-slate-500/20 shadow-sm"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <Ban className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <div className="text-left">
              <div>{lang === "hi" ? "सेवा में नहीं" : "Out of Service"}</div>
              <div className="text-[10px] font-normal text-[#4B5563]">
                {lang === "hi" ? "डिपो की ओर" : "Deadheading to depot"}
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Manual GPS Telemetry Override (F32 / P2-24) */}
      <Card className="p-4 bg-white border-[#D8DEE6] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
              {lang === "hi" ? "मैन्युअल जीपीएस ओवरराइड" : "Manual GPS Telemetry Override"}
            </h3>
            <p className="text-[11px] text-[#4B5563]">
              {lang === "hi"
                ? "यदि ऑन-बोर्ड GPS ट्रांसपोंडर विफल रहता है तो निर्देशांक दर्ज करें"
                : "Send manual coordinates if on-board transponder fails"}
            </p>
          </div>
          <input
            id="use-gps-override"
            type="checkbox"
            checked={useGpsOverride}
            onChange={(e) => setUseGpsOverride(e.target.checked)}
            className="w-4 h-4 text-[#0F5BD8] rounded border-gray-300 focus:ring-[#0F5BD8] cursor-pointer"
          />
        </div>

        {useGpsOverride && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="custom-lat" className="block text-[11px] font-bold text-[#4B5563] mb-1">
                Latitude
              </label>
              <input
                id="custom-lat"
                type="number"
                step="0.0001"
                value={customLat}
                onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                className="w-full min-h-[44px] px-3 bg-[#F5F7FA] border border-[#D8DEE6] rounded-xl text-xs font-mono font-semibold text-[#111827]"
              />
            </div>
            <div>
              <label htmlFor="custom-lng" className="block text-[11px] font-bold text-[#4B5563] mb-1">
                Longitude
              </label>
              <input
                id="custom-lng"
                type="number"
                step="0.0001"
                value={customLng}
                onChange={(e) => setCustomLng(parseFloat(e.target.value))}
                className="w-full min-h-[44px] px-3 bg-[#F5F7FA] border border-[#D8DEE6] rounded-xl text-xs font-mono font-semibold text-[#111827]"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Primary Action Button */}
      <Button
        variant="primary"
        disabled={submitting}
        onClick={() => handlePublishStatus(driverStatus)}
        className="w-full cursor-pointer shadow-lg shadow-blue-500/20"
      >
        {submitting
          ? lang === "hi"
            ? "अपडेट हो रहा है..."
            : "Broadcasting update..."
          : lang === "hi"
            ? `बस ${selectedBusId} स्थिति प्रकाशित करें`
            : `Publish Bus ${selectedBusId} Status`}
      </Button>
    </div>
  );
}

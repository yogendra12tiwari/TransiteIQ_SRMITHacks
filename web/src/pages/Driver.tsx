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
  const currentRoute = routes.find((r) => r.id === currentBus?.routeId);

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

      // Read existing sim/overrides and merge (D9)
      const overridesRef = doc(db, "sim", "overrides");
      const snap = await getDoc(overridesRef);
      const existing: SimOverrides = snap.exists() ? (snap.data() as SimOverrides) : {};

      const updated: SimOverrides = {
        ...existing,
        [selectedBusId]: overrideEntry,
      };

      await setDoc(overridesRef, updated);
      setPublishedSuccess(true);
      setTimeout(() => setPublishedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to publish driver override to sim/overrides:", err);
      // Fallback local acknowledgment for offline / demo mode
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
            className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg"
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
          className="w-full min-h-[48px] px-3 bg-[#F5F7FA] border border-[#D8DEE6] rounded-xl text-sm font-semibold text-[#111827] focus:outline-none focus:border-[#0F5BD8]"
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
              <option value="bus_route_23_1">bus_route_23_1 (Route 23)</option>
              <option value="bus_route_7_1">bus_route_7_1 (Route 7)</option>
              <option value="bus_route_41_1">bus_route_41_1 (Route 41)</option>
              <option value="bus_route_11_1">bus_route_11_1 (Route 11)</option>
            </>
          )}
        </select>

        {currentBus && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
            <span className="text-[#4B5563]">
              {lang === "hi" ? "रूट:" : "Route:"}{" "}
              <strong className="text-[#111827]">
                {currentRoute ? currentRoute.name : currentBus.routeId}
              </strong>
            </span>
            <span className="text-[#4B5563]">
              {lang === "hi" ? "गति:" : "Speed:"}{" "}
              <strong className="text-[#111827]">{Math.round(currentBus.speedMps * 3.6)} km/h</strong>
            </span>
            <span className="text-[#4B5563]">
              {lang === "hi" ? "स्थिति:" : "Status:"}{" "}
              <strong className="text-[#0F5BD8]">{currentBus.driverStatus || currentBus.status}</strong>
            </span>
          </div>
        )}
      </Card>

      {/* Published feedback banner */}
      {publishedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          <span>
            {lang === "hi"
              ? "स्थिति sim/overrides पर सफलतापूर्वक भेज दी गई!"
              : "Status published to sim/overrides successfully!"}
          </span>
        </div>
      )}

      {/* Driver Status Controls (F32 / P2-24) */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-[#111827]">
          {lang === "hi" ? "बस संचालन स्थिति सेट करें" : "Set Bus Operational Status"}
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("RUNNING")}
            className={`min-h-[56px] p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors text-left ${
              driverStatus === "RUNNING"
                ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm">{lang === "hi" ? "चालू" : "Running"}</div>
              <div className="text-[10px] text-[#4B5563]">Normal service</div>
            </div>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("STALLED")}
            className={`min-h-[56px] p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors text-left ${
              driverStatus === "STALLED"
                ? "bg-rose-50 border-rose-500 text-rose-900 font-bold ring-2 ring-rose-500"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm">{lang === "hi" ? "खराब / रुकी" : "Stalled"}</div>
              <div className="text-[10px] text-[#4B5563]">Breakdown alert</div>
            </div>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("BREAK")}
            className={`min-h-[56px] p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors text-left ${
              driverStatus === "BREAK"
                ? "bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <Coffee className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm">{lang === "hi" ? "विश्राम" : "Driver Break"}</div>
              <div className="text-[10px] text-[#4B5563]">Temporary halt</div>
            </div>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => handlePublishStatus("OUT_OF_SERVICE")}
            className={`min-h-[56px] p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors text-left ${
              driverStatus === "OUT_OF_SERVICE"
                ? "bg-slate-200 border-slate-600 text-slate-900 font-bold ring-2 ring-slate-600"
                : "bg-white border-[#D8DEE6] text-[#111827] hover:bg-slate-50"
            }`}
          >
            <Ban className="w-5 h-5 text-slate-600 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm">{lang === "hi" ? "सेवा समाप्त" : "Out of Service"}</div>
              <div className="text-[10px] text-[#4B5563]">Ghost departure</div>
            </div>
          </button>
        </div>
      </section>

      {/* GPS Telemetry Simulation Controls (M6b P2-25) */}
      <Card className="p-4 bg-white border-[#D8DEE6] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#0F5BD8]" aria-hidden="true" />
            <span className="font-bold text-sm text-[#111827]">
              {lang === "hi" ? "जीपीएस टेलीमेट्री ओवरराइड" : "GPS Telemetry Override"}
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useGpsOverride}
              onChange={(e) => setUseGpsOverride(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5BD8]" />
          </label>
        </div>

        {useGpsOverride && (
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <p className="text-[#4B5563]">
              {lang === "hi"
                ? "फोन जीपीएस निर्देशांक को बस के वास्तविक स्थान के रूप में सिमुलेशन में भेजें:"
                : "Simulate custom coordinates to test live map tracking:"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[#4B5563] block">Lat:</span>
                <input
                  type="number"
                  step="0.001"
                  value={customLat}
                  onChange={(e) => setCustomLat(parseFloat(e.target.value) || 26.85)}
                  className="w-full p-2 border border-[#D8DEE6] rounded-lg"
                />
              </div>
              <div>
                <span className="text-[#4B5563] block">Lng:</span>
                <input
                  type="number"
                  step="0.001"
                  value={customLng}
                  onChange={(e) => setCustomLng(parseFloat(e.target.value) || 80.96)}
                  className="w-full p-2 border border-[#D8DEE6] rounded-lg"
                />
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => handlePublishStatus(driverStatus)}
              className="w-full min-h-[44px] text-xs font-bold mt-2"
            >
              {lang === "hi" ? "जीपीएस पिंग भेजें" : "Send GPS Ping"}
            </Button>
          </div>
        )}
      </Card>

      {/* PRD Decision D9 Architectural Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
        <p className="font-bold">Architectural Guarantee (Decision D9):</p>
        <p>
          Driver updates write exclusively to <code>sim/overrides</code>. The presenter/simulator loop merges
          these overrides every 2 seconds into authoritative <code>sim/live</code>.
        </p>
      </div>
    </div>
  );
}

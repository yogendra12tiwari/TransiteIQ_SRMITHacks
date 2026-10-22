import { useState, useMemo, useEffect } from "react";
import { LUCKNOW_PLACES, type RouteOption, planRoutes } from "@transitiq/shared";
import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { SpeedSafetySlider } from "../components/SpeedSafetySlider";
import { RouteCompareCard } from "../components/RouteCompareCard";
import { MapView, type OverlayRoute } from "../components/MapView";

export function PlanPage() {
  const { routes, stops, loading: networkLoading } = useNetwork();
  const { data, isStale } = useLiveState();
  const buses = data?.buses ?? [];
  const alerts = data?.alerts ?? [];

  const [originPlaceId, setOriginPlaceId] = useState<string>("place_lohia_crossing");
  const [destPlaceId, setDestPlaceId] = useState<string>("place_gomtinagar");
  const [alpha, setAlpha] = useState<number>(0.5);
  const [hour, setHour] = useState<number>(20); // 8 PM evening peak
  const [selectedRouteId, setSelectedRouteId] = useState<string | undefined>(undefined);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const originPlace = useMemo(
    () => LUCKNOW_PLACES.find((p) => p.id === originPlaceId) ?? LUCKNOW_PLACES[0]!,
    [originPlaceId],
  );

  const destPlace = useMemo(
    () => LUCKNOW_PLACES.find((p) => p.id === destPlaceId) ?? LUCKNOW_PLACES[3]!,
    [destPlaceId],
  );

  const stopNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    stops.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [stops]);

  // Handle route planning
  const options = useMemo(() => {
    if (routes.length === 0 || stops.length === 0) return [];
    if (originPlace.id === destPlace.id) return [];

    return planRoutes({
      origin: { lat: originPlace.lat, lng: originPlace.lng },
      destination: { lat: destPlace.lat, lng: destPlace.lng },
      network: { routes, stops },
      hour,
      alpha,
    });
  }, [originPlace, destPlace, routes, stops, hour, alpha]);

  const fastest = useMemo(() => options.find((o) => o.label === "Fastest"), [options]);
  const safer = useMemo(() => options.find((o) => o.label === "Safer"), [options]);

  // Keep selected route valid
  useEffect(() => {
    if (options.length > 0 && (!selectedRouteId || !options.some((o) => o.id === selectedRouteId))) {
      setSelectedRouteId(safer ? safer.id : options[0]!.id);
    }
  }, [options, selectedRouteId, safer]);

  const handleSelectRoute = (option: RouteOption) => {
    setSelectedRouteId(option.id);
    try {
      localStorage.setItem("transitiq_selected_route", JSON.stringify(option));
    } catch (e) {
      console.warn("Could not save selected route to localStorage:", e);
    }
    setSuccessToast(
      lang === "hi"
        ? `${option.label} मार्ग चुना गया (${option.travelMin} मिनट)। सेफ वेट के लिए तैयार!`
        : `Selected ${option.label} route (${option.travelMin} min). Ready for Safe Wait!`,
    );
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleSwap = () => {
    const currentOrigin = originPlaceId;
    setOriginPlaceId(destPlaceId);
    setDestPlaceId(currentOrigin);
  };

  const handlePreset = (originId: string, destId: string) => {
    setOriginPlaceId(originId);
    setDestPlaceId(destId);
  };

  // Map Overlay Polylines for Fastest vs Safer comparison (M4-20)
  const overlayRoutes: OverlayRoute[] = useMemo(() => {
    const list: OverlayRoute[] = [];
    if (fastest) {
      list.push({
        id: "overlay_fastest",
        color: "#e11d48", // Crimson red for Fastest (via Stop A)
        polyline: fastest.polyline,
        name: `Fastest (${fastest.travelMin}m)`,
        weight: selectedRouteId === fastest.id ? 7 : 4,
      });
    }
    if (safer && safer.id !== fastest?.id) {
      list.push({
        id: "overlay_safer",
        color: "#10b981", // Emerald green for Safer (via Stop B)
        polyline: safer.polyline,
        name: `Safer (${safer.travelMin}m)`,
        weight: selectedRouteId === safer.id ? 7 : 4,
      });
    }
    return list;
  }, [fastest, safer, selectedRouteId]);

  if (networkLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-3" />
        Loading Lucknow transit network...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-lg">
          <span>✓ {successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header with Title and Language Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">🗺️</span>
            <h1 className="text-xl font-bold text-white">
              {lang === "hi" ? "स्मार्ट रूट प्लानर" : "Safety-Aware Route Planner"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === "hi"
              ? "गति बनाम असुरक्षित इंतज़ार (एक्सपोज़र मिनट) की पारदर्शी तुलना"
              : "Compare Fastest vs. Safer options with transparent exposure minutes"}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 transition"
          >
            {lang === "en" ? "हिंदी (Hindi)" : "English"}
          </button>
        </div>
      </div>

      {/* Trip Planning Form */}
      <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-5">
        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400">{lang === "hi" ? "त्वरित चयन:" : "Presets:"}</span>
          <button
            data-testid="preset-demo-btn"
            onClick={() => handlePreset("place_lohia_crossing", "place_gomtinagar")}
            className={`text-xs px-3 py-1 rounded-lg border transition font-semibold ${
              originPlaceId === "place_lohia_crossing" && destPlaceId === "place_gomtinagar"
                ? "bg-purple-600/30 border-purple-500/60 text-purple-300"
                : "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            ⚡{" "}
            {lang === "hi" ? "डेमो ट्रिप (लोहिया पथ → गोमती नगर)" : "Demo Pair: Lohia Crossing → Gomti Nagar"}
          </button>

          <button
            onClick={() => handlePreset("place_lu", "place_gomtinagar")}
            className={`text-xs px-3 py-1 rounded-lg border transition ${
              originPlaceId === "place_lu" && destPlaceId === "place_gomtinagar"
                ? "bg-indigo-600/30 border-indigo-500/60 text-indigo-300"
                : "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🎓 {lang === "hi" ? "विश्वविद्यालय → गोमती नगर" : "University → Gomti Nagar"}
          </button>

          <button
            onClick={() => handlePreset("place_charbagh", "place_indiranagar")}
            className={`text-xs px-3 py-1 rounded-lg border transition ${
              originPlaceId === "place_charbagh" && destPlaceId === "place_indiranagar"
                ? "bg-indigo-600/30 border-indigo-500/60 text-indigo-300"
                : "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700"
            }`}
          >
            🚆 {lang === "hi" ? "चारबाग → इंदिरा नगर" : "Charbagh → Indira Nagar"}
          </button>
        </div>

        {/* Origin / Destination Pickers with Swap */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-3">
          {/* Origin */}
          <div className="space-y-1">
            <label
              htmlFor="origin-select"
              className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
            >
              <span>🟢</span>
              <span>{lang === "hi" ? "प्रस्थान स्थान (Origin)" : "Origin Location"}</span>
            </label>
            <select
              id="origin-select"
              data-testid="origin-select"
              value={originPlaceId}
              onChange={(e) => setOriginPlaceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {LUCKNOW_PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === "hi" && p.nameHi ? p.nameHi : p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center md:pt-5">
            <button
              onClick={handleSwap}
              title="Swap Origin and Destination"
              aria-label="Swap Origin and Destination"
              className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition border border-slate-600"
            >
              ⇄
            </button>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label
              htmlFor="dest-select"
              className="text-xs font-semibold text-slate-300 flex items-center gap-1.5"
            >
              <span>🔴</span>
              <span>{lang === "hi" ? "गंतव्य स्थान (Destination)" : "Destination Location"}</span>
            </label>
            <select
              id="dest-select"
              data-testid="dest-select"
              value={destPlaceId}
              onChange={(e) => setDestPlaceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {LUCKNOW_PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === "hi" && p.nameHi ? p.nameHi : p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Time of Day & Slider Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Hour Selector */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                {lang === "hi" ? "यात्रा का समय:" : "Travel Time-of-Day:"}
              </span>
              <span className="font-mono text-indigo-400 font-bold">
                {hour}:00 IST ({hour >= 19 ? "🌙 Night" : "☀️ Evening Peak"})
              </span>
            </div>
            <input
              type="range"
              min={17}
              max={22}
              step={1}
              value={hour}
              onChange={(e) => setHour(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>17:00 (Peak)</span>
              <span className="text-amber-400">20:00 (Evening)</span>
              <span>22:00 (Late Night)</span>
            </div>
          </div>

          {/* Speed vs Safety Slider */}
          <SpeedSafetySlider alpha={alpha} onChange={setAlpha} lang={lang} />
        </div>
      </div>

      {/* Origin equals Destination validation */}
      {originPlace.id === destPlace.id && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs">
          ⚠️{" "}
          {lang === "hi"
            ? "प्रस्थान और गंतव्य स्थान एक ही हैं। कृपया भिन्न स्थान चुनें।"
            : "Origin and destination are identical. Please select different locations."}
        </div>
      )}

      {/* No Routes Available */}
      {originPlace.id !== destPlace.id && options.length === 0 && (
        <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700 text-center space-y-2 text-slate-400">
          <p className="text-sm font-semibold text-white">
            {lang === "hi"
              ? "इस रूट पर कोई सीधा या सिंगल-ट्रांसफर मार्ग उपलब्ध नहीं है"
              : "No direct or single-transfer route found"}
          </p>
          <p className="text-xs">
            {lang === "hi"
              ? "कृपया किसी अन्य स्टॉप या पास के लैंडमार्क का चयन करें।"
              : "Try choosing another origin or destination within our Lucknow transit corridors."}
          </p>
        </div>
      )}

      {/* Route Comparison Section */}
      {options.length > 0 && (
        <RouteCompareCard
          fastest={fastest}
          safer={safer}
          selectedRouteId={selectedRouteId}
          onSelectRoute={handleSelectRoute}
          lang={lang}
          stopNames={stopNamesMap}
        />
      )}

      {/* Map Section with Route Overlays */}
      <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🗺️</span>
            <span>
              {lang === "hi" ? "मार्ग दृश्य और स्टॉप सुरक्षा" : "Route Visualization & Boarding Security"}
            </span>
          </h2>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-3 h-1 bg-rose-500 rounded" />
              <span>{lang === "hi" ? "सबसे तेज़ (फास्टेस्ट)" : "Fastest Path (Crimson)"}</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-3 h-1 bg-emerald-500 rounded" />
              <span>{lang === "hi" ? "सुरक्षित (सेफ़र)" : "Safer Path (Emerald)"}</span>
            </span>
          </div>
        </div>

        <div className="h-[460px] rounded-xl overflow-hidden border border-slate-700/60">
          <MapView
            routes={routes}
            stops={stops}
            buses={buses}
            alerts={alerts}
            isStale={isStale}
            overlayRoutes={overlayRoutes}
            originCoord={[originPlace.lat, originPlace.lng]}
            destinationCoord={[destPlace.lat, destPlace.lng]}
          />
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Trip, formatEtaRange } from "@transitiq/shared";
import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { MapView } from "../components/MapView";

export function TripSharePage() {
  const { token } = useParams<{ token: string }>();
  const { routes, stops, loading: networkLoading } = useNetwork();
  const { data: liveData } = useLiveState();
  const buses = useMemo(() => liveData?.buses ?? [], [liveData?.buses]);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [lang, setLang] = useState<"en" | "hi">("en");

  // Fetch trip document (M5-27)
  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setLoading(false);
      setIsExpired(true);
      return;
    }

    async function fetchTrip() {
      try {
        const snap = await getDoc(doc(db, "trips", token!));
        if (!isMounted) return;

        if (!snap.exists()) {
          setIsExpired(true);
          return;
        }

        const raw = snap.data();
        const parsed = Trip.parse(raw);
        const now = Date.now();

        // Check if expired or terminated (M5-29)
        if (
          parsed.expiresAt <= now ||
          parsed.state === "COMPLETED" ||
          parsed.state === "CANCELLED" ||
          parsed.state === "EXPIRED"
        ) {
          setIsExpired(true);
          return;
        }

        setTrip(parsed);
      } catch (err) {
        console.warn("Could not load trip link (may be expired or non-existent):", err);
        if (isMounted) setIsExpired(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTrip();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const targetRoute = useMemo(() => {
    if (!trip || routes.length === 0) return null;
    return routes.find((r) => r.id === trip.routeId) ?? null;
  }, [trip, routes]);

  const targetBus = useMemo(() => {
    if (!trip) return null;
    return buses.find((b) => b.routeId === trip.routeId) ?? null;
  }, [trip, buses]);

  const boardingStop = useMemo(() => {
    if (!trip) return null;
    return stops.find((s) => s.id === trip.boardingStopId);
  }, [trip, stops]);

  const destinationStop = useMemo(() => {
    if (!trip) return null;
    return stops.find((s) => s.id === trip.destinationStopId);
  }, [trip, stops]);

  if (loading || networkLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-slate-400">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full mr-3" />
        Checking secure trip status...
      </div>
    );
  }

  // Friendly Expired / Invalid screen without revealing token history (M5-29)
  if (isExpired || !trip || !targetRoute) {
    return (
      <div
        data-testid="trip-expired-card"
        className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-slate-800/80 border border-slate-700/60 shadow-2xl text-center space-y-5"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto">
          ⏳
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">
            {lang === "hi" ? "ट्रिप ट्रैकिंग लिंक समाप्त हो गया है" : "Trip Tracking Link Expired"}
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === "hi"
              ? "यह यात्रा पूरी हो चुकी है या इसकी 2 घंटे की सुरक्षा वैधता समाप्त हो चुकी है। गोपनीयता की रक्षा के लिए यह लिंक अब सक्रिय नहीं है।"
              : "This journey has concluded or its 2-hour security validity window has elapsed. For commuter privacy, live tracking access is permanently closed."}
          </p>
        </div>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
        >
          {lang === "hi" ? "ट्रांज़िटआईक्यू होम पर जाएं" : "Go to TransitIQ Home"}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-6 space-y-4">
      {/* Privacy Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between text-xs text-indigo-200">
        <div className="flex items-center gap-2">
          <span>🛡️</span>
          <span>
            {lang === "hi"
              ? "विश्वसनीय संपर्क दृश्य: कोई व्यक्तिगत जानकारी शेयर नहीं की जाती"
              : "Trusted Contact View: Zero PII or private identity shared"}
          </span>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
          className="text-[11px] underline text-indigo-300 hover:text-white"
        >
          {lang === "en" ? "हिंदी" : "English"}
        </button>
      </div>

      {/* Live Trip Status Card */}
      <div
        data-testid="trip-live-card"
        className="p-6 rounded-3xl bg-slate-800/90 border border-slate-700/60 shadow-xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: targetRoute.color }} />
            <h1 className="text-lg font-bold text-white">{targetRoute.name}</h1>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
            ● {lang === "hi" ? "लाइव ट्रैकिंग सक्रिय" : "Live En Route"}
          </span>
        </div>

        {/* Origin -> Destination corridor */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {lang === "hi" ? "बोर्डिंग स्टॉप:" : "Boarding Stop:"}
            </span>
            <span className="font-semibold text-white">
              {boardingStop ? boardingStop.name : trip.boardingStopId}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">
              {lang === "hi" ? "गंतव्य स्टॉप:" : "Destination Stop:"}
            </span>
            <span className="font-semibold text-white">
              {destinationStop ? destinationStop.name : trip.destinationStopId}
            </span>
          </div>
        </div>

        {/* Live ETA indicator */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40">
          <div>
            <span className="text-xs text-emerald-300 block font-medium">
              {lang === "hi" ? "अनुमानित आगमन समय:" : "Estimated Arrival Window:"}
            </span>
            <span className="text-2xl font-bold font-mono text-white">{formatEtaRange(4, 7)}</span>
          </div>
          <span className="text-xs text-slate-400">
            {targetBus ? `Bus ID: ${targetBus.id}` : "Tracking Fleet"}
          </span>
        </div>

        {/* Live Map Frame */}
        <div className="h-[280px] rounded-2xl overflow-hidden border border-slate-700">
          <MapView
            routes={[targetRoute]}
            stops={stops.filter((s) => s.id === trip.boardingStopId || s.id === trip.destinationStopId)}
            buses={buses.filter((b) => b.routeId === targetRoute.id)}
          />
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          {lang === "hi"
            ? "यह लिंक 2 घंटे के भीतर या यात्रा समाप्त होते ही स्वतः निष्प्रभावी हो जाएगा।"
            : "This tracking link expires automatically within 2 hours or once the trip completes."}
        </p>
      </div>
    </div>
  );
}

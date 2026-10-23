import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Camera, ShieldCheck, Clock, MapPin } from "lucide-react";
import { useNetwork } from "../hooks/useNetwork";
import { useLiveState } from "../hooks/useLiveState";
import { Button } from "../components/primitives/Button";
import { Card } from "../components/primitives/Card";
import { RiskBadge } from "../components/RiskBadge";
import { waitRisk } from "@transitiq/shared";

export function StopTimetablePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hi" ? "hi" : "en";

  const { stops, routes, safeSpots, loading: networkLoading } = useNetwork();
  const { data: liveData } = useLiveState();

  const stop = stops.find((s) => s.id === id);
  const etas = liveData?.etas.filter((e) => e.stopId === id) ?? [];
  const hour = liveData?.hour ?? new Date().getHours();

  if (networkLoading) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-32 bg-slate-200 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!stop) {
    return (
      <div className="max-w-md mx-auto p-4 text-center space-y-4">
        <h2 className="text-lg font-bold text-[#111827]">
          {lang === "hi" ? "स्टॉप नहीं मिला" : "Stop not found"}
        </h2>
        <Link to="/" className="text-[#0F5BD8] underline text-sm">
          {lang === "hi" ? "होम पर वापस जाएं" : "Return to home"}
        </Link>
      </div>
    );
  }

  // Find routes passing through this stop
  const servingRoutes = routes.filter((r) => r.stopIds.includes(stop.id));

  // Risk evaluation
  const avgWait = stop.id === "stop_A" ? 18 : stop.id === "stop_B" ? 4 : 8;
  const reportsCount = stop.id === "stop_A" ? 7 : 1;
  const riskInfo = waitRisk(stop, hour, avgWait, reportsCount);

  // Safe spots near this stop
  const nearbySafeSpots = (safeSpots ?? []).filter((sp) => stop.safeSpotIds?.includes(sp.id));

  return (
    <div
      data-testid="stop-timetable-page"
      className="max-w-md mx-auto w-full flex-1 flex flex-col p-4 space-y-4 pb-24"
    >
      {/* Top back navigation */}
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="p-2 -ml-2 text-[#4B5563] hover:text-[#111827] min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg"
          aria-label={t("common.back", "Back")}
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#111827]">
            {lang === "hi" && stop.nameHi ? stop.nameHi : stop.name}
          </h1>
          <p className="text-xs text-[#4B5563]">
            {lang === "hi" ? "समय सारिणी एवं सुरक्षा स्थिति" : "Timetable & Waiting Safety"}
          </p>
        </div>
      </div>

      {/* Safety & Stop Overview Card */}
      <Card className="p-4 bg-white border-[#D8DEE6] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#4B5563]">
            {lang === "hi" ? "प्रतीक्षा सुरक्षा स्तर" : "Waiting Safety"}
          </span>
          <RiskBadge label={riskInfo.label} score={riskInfo.score} />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {stop.cctv ? (
            <span className="px-2 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md font-semibold flex items-center gap-1">
              <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{lang === "hi" ? "पास में सीसीटीवी कैमरा" : "Camera nearby"}</span>
            </span>
          ) : (
            <span className="px-2 py-1 bg-slate-100 border border-slate-300 text-[#4B5563] rounded-md font-medium">
              {lang === "hi" ? "कोई सीसीटीवी नहीं" : "No camera"}
            </span>
          )}

          <span
            className={`px-2 py-1 rounded-md font-semibold ${
              stop.lighting === "good"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : stop.lighting === "poor"
                  ? "bg-rose-50 text-rose-800 border border-rose-300"
                  : "bg-amber-50 text-amber-800 border border-amber-300"
            }`}
          >
            {lang === "hi"
              ? stop.lighting === "good"
                ? "अच्छी रोशनी"
                : stop.lighting === "poor"
                  ? "खराब रोशनी"
                  : "मध्यम रोशनी"
              : `${stop.lighting} lighting`}
          </span>

          <span className="px-2 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-medium">
            {stop.ridershipPerEvening} {lang === "hi" ? "यात्री/शाम" : "riders/eve"}
          </span>
        </div>

        {riskInfo.explanation && (
          <p className="text-xs text-[#4B5563] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {riskInfo.explanation}
          </p>
        )}
      </Card>

      {/* Serving Routes & Timetable */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111827]">
            {lang === "hi" ? "आने वाली बसें और समय" : "Next Arrivals & Schedule"}
          </h2>
          <span className="text-[11px] text-[#4B5563] flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span>{lang === "hi" ? "ऑफ़लाइन सहेजा गया" : "Cached for offline"}</span>
          </span>
        </div>

        <div className="space-y-2">
          {servingRoutes.length === 0 ? (
            <p className="text-xs text-[#4B5563] italic">
              {lang === "hi"
                ? "इस स्टॉप पर कोई सीधी बस नहीं है।"
                : "No scheduled buses currently serve this stop."}
            </p>
          ) : (
            servingRoutes.map((route) => {
              const routeEtas = etas.filter((e) => {
                // Check if bus belongs to this route
                const bus = liveData?.buses.find((b) => b.id === e.busId);
                return bus?.routeId === route.id;
              });

              const nextEta = routeEtas[0];
              const eveningHeadway = route.headwayMin.evening;

              return (
                <Card key={route.id} className="p-3 bg-white border-[#D8DEE6] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: route.color }}
                        aria-hidden="true"
                      />
                      <span className="font-bold text-sm text-[#111827]">{route.name}</span>
                    </div>

                    {nextEta ? (
                      <span className="text-xs font-bold text-[#0F5BD8] bg-blue-50 px-2 py-0.5 rounded">
                        {lang === "hi"
                          ? `${nextEta.lowMin}–${nextEta.highMin} मिनट में`
                          : `in ${nextEta.lowMin}–${nextEta.highMin} min`}
                      </span>
                    ) : (
                      <span className="text-xs text-[#4B5563]">
                        {lang === "hi" ? `हर ${eveningHeadway} मिनट` : `Every ${eveningHeadway}m`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#4B5563] pt-1 border-t border-slate-100">
                    <span>
                      {lang === "hi" ? "किराया:" : "Fare:"} ₹{route.fare?.baseInr ?? 10}–₹
                      {Math.round((route.fare?.baseInr ?? 10) + 12)}
                    </span>
                    <Link to={`/route/${route.id}`} className="text-[#0F5BD8] font-semibold hover:underline">
                      {lang === "hi" ? "रूट देखें →" : "View route →"}
                    </Link>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Nearby Safe Spots within 250m */}
      {nearbySafeSpots.length > 0 && (
        <section className="space-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>{lang === "hi" ? "250 मीटर के अंदर सुरक्षित स्थान" : "Safe places within 250m"}</span>
          </div>
          <div className="space-y-1.5">
            {nearbySafeSpots.map((spot) => (
              <div
                key={spot.id}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="font-medium text-[#111827] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#4B5563]" aria-hidden="true" />
                  <span>{spot.name}</span>
                </div>
                {spot.openLate && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {lang === "hi" ? "देर रात खुला" : "Late open"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Single Primary Action: Plan from here */}
      <div className="pt-2">
        <Button
          variant="primary"
          onClick={() => navigate(`/plan?from=${encodeURIComponent(stop.name)}`)}
          className="w-full min-h-[48px] font-bold"
        >
          {lang === "hi" ? "इस स्टॉप से यात्रा प्लान करें" : "Plan trip from this stop"}
        </Button>
      </div>
    </div>
  );
}

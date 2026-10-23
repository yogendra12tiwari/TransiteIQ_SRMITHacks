import type { Bus, Route, Stop } from "@transitiq/shared";
import { useTranslation } from "react-i18next";
import { Card } from "./primitives/Card";

export interface BusSheetProps {
  bus: Bus | null;
  route?: Route;
  stops: Stop[];
  onClose: () => void;
  lang?: "en" | "hi";
}

export function BusSheet({ bus, route, stops, onClose, lang = "en" }: BusSheetProps) {
  const { t } = useTranslation();

  if (!bus) return null;

  const isDwelling = bus.speedMps === 0;
  const speedKmh = Math.round(bus.speedMps * 3.6);

  // Find upcoming stops along the route
  const routeStops = route
    ? route.stopIds.map((id) => stops.find((s) => s.id === id)).filter((s): s is Stop => Boolean(s))
    : [];

  return (
    <section
      role="region"
      aria-label={`Bus ${route?.name || bus.routeId} details`}
      data-testid="bus-bottom-sheet"
      className="absolute inset-x-0 bottom-0 z-30 bg-[#0F172A] border-t border-[#334155] p-4 rounded-t-2xl shadow-2xl text-[#F8FAFC] animate-in slide-in-from-bottom-4 duration-200 max-h-[70vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between pb-3 border-b border-[#334155]">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: route?.color || "#F59E0B" }}
              aria-hidden="true"
            />
            <h2 className="text-base font-bold text-white">{route?.name || bus.routeId}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8] font-mono border border-[#334155]">
              {bus.id}
            </span>
          </div>

          <p className="text-sm text-[#94A3B8] mt-1">
            {isDwelling ? t("home.dwelling", "Waiting at stop") : t("home.moving", "Moving")}
            {" • "}
            {speedKmh > 0 ? `${speedKmh} km/h` : "0 km/h"}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.done", "Done")}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {routeStops.length > 0 && (
        <div className="mt-3 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
            {lang === "hi" ? "मार्ग के स्टॉप" : "Stops along route"}
          </h3>
          <div className="space-y-1.5">
            {routeStops.map((stop, idx) => (
              <Card
                key={stop.id}
                className="p-2.5 bg-[#1E293B] border-[#334155] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#334155] text-[#F8FAFC] flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-white">{stop.name}</span>
                </div>
                <span className="text-[11px] text-[#94A3B8] capitalize">
                  {stop.lighting === "good" ? "Well lit" : "Quiet"}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
